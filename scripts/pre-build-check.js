#!/usr/bin/env node

/**
 * Pre-build validation script for ZenScan
 * Checks for common issues before EAS build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let hasErrors = false;
let hasWarnings = false;

function log(color, prefix, message) {
  console.log(`${color}${prefix}${COLORS.reset} ${message}`);
}

function error(message) {
  log(COLORS.red, '✖', message);
  hasErrors = true;
}

function warning(message) {
  log(COLORS.yellow, '⚠', message);
  hasWarnings = true;
}

function success(message) {
  log(COLORS.green, '✓', message);
}

function info(message) {
  log(COLORS.blue, 'ℹ', message);
}

console.log('\n' + COLORS.blue + '🔍 Running pre-build validation for ZenScan...\n' + COLORS.reset);

// Check 1: Validate app.json
info('Checking app.json configuration...');
try {
  const appJsonPath = path.join(__dirname, '..', 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  const expo = appJson.expo;

  // Check bundle identifier
  if (expo.ios?.bundleIdentifier !== 'com.zenscan.app') {
    error(`iOS bundle ID should be 'com.zenscan.app', got '${expo.ios?.bundleIdentifier}'`);
  } else {
    success('iOS bundle ID is correct: com.zenscan.app');
  }

  // Check Android package
  if (expo.android?.package !== 'com.zenscan.app') {
    error(`Android package should be 'com.zenscan.app', got '${expo.android?.package}'`);
  } else {
    success('Android package is correct: com.zenscan.app');
  }

  // Check app name
  if (expo.name !== 'ZenScan') {
    warning(`App name is '${expo.name}', expected 'ZenScan'`);
  } else {
    success('App name is correct: ZenScan');
  }

  // Check required iOS permissions
  const requiredPermissions = [
    'NSCameraUsageDescription'
  ];

  requiredPermissions.forEach(permission => {
    if (!expo.ios?.infoPlist?.[permission]) {
      error(`Missing iOS permission: ${permission}`);
    } else {
      success(`iOS permission present: ${permission}`);
    }
  });

  // Check ITSAppUsesNonExemptEncryption (should be false)
  if (expo.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === undefined) {
    error('Missing iOS key: ITSAppUsesNonExemptEncryption');
  } else if (expo.ios.infoPlist.ITSAppUsesNonExemptEncryption === false) {
    success('iOS encryption setting: ITSAppUsesNonExemptEncryption = false');
  } else {
    warning('ITSAppUsesNonExemptEncryption is not false');
  }

  // Check version
  success(`Version: ${expo.version}`);

} catch (err) {
  error(`Failed to validate app.json: ${err.message}`);
}

// Check 2: TypeScript validation
info('\nRunning TypeScript type check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  success('TypeScript: No type errors found');
} catch (err) {
  error('TypeScript: Type errors detected');
  console.log(err.stdout?.toString() || err.stderr?.toString());
}

// Check 3: Check for package.json and package-lock.json sync
info('\nChecking package.json and package-lock.json sync...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));

  if (packageJson.version !== packageLock.version) {
    warning('package.json and package-lock.json versions differ');
  } else {
    success('package.json and package-lock.json are in sync');
  }
} catch (err) {
  warning(`Could not verify package sync: ${err.message}`);
}

// Check 4: Verify required dependencies
info('\nChecking required dependencies...');
const requiredDeps = [
  'react-native-vision-camera',
  'react-native-reanimated',
  'react-native-svg',
  'react-native-haptic-feedback',
  'expo-file-system',
  'react-dom'
];

try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  requiredDeps.forEach(dep => {
    if (!deps[dep]) {
      error(`Missing required dependency: ${dep}`);
    } else {
      success(`Dependency present: ${dep}@${deps[dep]}`);
    }
  });
} catch (err) {
  error(`Failed to check dependencies: ${err.message}`);
}

// Check 5: Validate eas.json
info('\nChecking eas.json configuration...');
try {
  const easJson = JSON.parse(fs.readFileSync('eas.json', 'utf8'));

  if (!easJson.submit?.production?.ios?.ascAppId) {
    error('Missing ascAppId in eas.json submit configuration');
  } else if (easJson.submit.production.ios.ascAppId !== '6753142099') {
    error(`ascAppId should be '6753142099', got '${easJson.submit.production.ios.ascAppId}'`);
  } else {
    success('eas.json: ascAppId is correct (6753142099)');
  }

  if (!easJson.submit?.production?.ios?.appleTeamId) {
    error('Missing appleTeamId in eas.json');
  } else {
    success(`eas.json: appleTeamId is set (${easJson.submit.production.ios.appleTeamId})`);
  }

  if (!easJson.submit?.production?.ios?.appleId) {
    error('Missing appleId in eas.json');
  } else {
    success(`eas.json: appleId is set (${easJson.submit.production.ios.appleId})`);
  }
} catch (err) {
  error(`Failed to validate eas.json: ${err.message}`);
}

// Check 6: Run expo-doctor
info('\nRunning expo-doctor...');
try {
  const output = execSync('npx expo-doctor', { stdio: 'pipe', encoding: 'utf8' });
  if (output.includes('No issues detected')) {
    success('expo-doctor: All checks passed');
  } else {
    warning('expo-doctor: Some issues detected');
    console.log(output);
  }
} catch (err) {
  warning('expo-doctor: Failed to run or found issues');
  if (err.stdout) console.log(err.stdout);
}

// Summary
console.log('\n' + COLORS.blue + '═══════════════════════════════════════\n' + COLORS.reset);
if (hasErrors) {
  console.log(COLORS.red + '✖ Pre-build check FAILED' + COLORS.reset);
  console.log('Please fix the errors above before building.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log(COLORS.yellow + '⚠ Pre-build check passed with warnings' + COLORS.reset);
  console.log('Review the warnings above. Build may proceed.\n');
  process.exit(0);
} else {
  console.log(COLORS.green + '✓ Pre-build check PASSED' + COLORS.reset);
  console.log('All checks passed! Ready to build.\n');
  process.exit(0);
}
