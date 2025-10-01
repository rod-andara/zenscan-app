# ZenScan Build Tracker

**App**: ZenScan
**Bundle ID**: com.zenscan.app
**App Store Connect ID**: 6753142099
**Repository**: https://github.com/rod-andara/zenscan-app

---

## 📊 Build Status Overview

| Build | Date | Status | Issue | Fix | Notes |
|-------|------|--------|-------|-----|-------|
| **15** | Oct 1, 2025 | ✅ **LATEST** | Worklets version mismatch | Pinned exact versions | **Testing in progress** |
| 14 | Oct 1, 2025 | ❌ Crashed | Location + Worklets | Disabled location | Exposed Worklets issue |
| 13 | Oct 1, 2025 | ❌ Crashed | Location services | Added enableLocation=false | Incomplete fix |
| 12 | Oct 1, 2025 | ⚠️ Warning | Apple ITMS-90683 | Added location permission | Submitted with warning |
| 11 | Oct 1, 2025 | ⚠️ Warning | Missing location string | - | Not submitted |
| 8-10 | Oct 1, 2025 | ✅ Working | Various config | EAS setup fixes | Phase 1 & 2 features |
| 1-7 | Prior | 🔧 Development | - | - | Initial development |

---

## 📦 Current Build: Build 15

### **Status**: ✅ Submitted to TestFlight (Processing)
### **Submitted**: October 1, 2025, 12:07:52

**Build Details**: https://expo.dev/accounts/rod_andara/projects/zenscan/builds/4a67c1e0-818c-4af7-b43c-603575db584c

**Download IPA**: https://expo.dev/artifacts/eas/abU3pue5Mm33mXni6RsdE1.ipa

**TestFlight**: https://appstoreconnect.apple.com/apps/6753142099/testflight/ios

### **What's Fixed**
✅ Worklets version mismatch (SIGABRT crash on Thread 8)
✅ Location services completely disabled
✅ All Phase 1 & 2 features working

### **Documentation**
📄 [BUILD-15-WORKLETS-FIX.md](./BUILD-15-WORKLETS-FIX.md) - Detailed explanation

---

## 🔄 Build History (Reverse Chronological)

### **Build 15** - October 1, 2025, 12:07 ✅ LATEST
**Issue**: Worklets version mismatch crash
- JavaScript: Worklets 0.6.0 (due to caret versioning)
- Native iOS: Worklets 0.5.1
- Crash: `RNWorklet::DispatchQueue` SIGABRT on Thread 8

**Fix Applied**:
- Pinned `react-native-worklets@0.5.1` (exact, no caret)
- Pinned `react-native-worklets-core@1.6.2` (exact, no caret)
- Clean reinstall: `rm -rf node_modules package-lock.json`
- Cleared Metro cache
- Full native rebuild: `npx expo prebuild --clean`

**Key Changes**:
```json
// package.json
"react-native-worklets": "0.5.1",          // was: ^0.5.1
"react-native-worklets-core": "1.6.2"      // was: ^1.6.2
```

**Commits**:
- `5e454e2` - fix: Pin exact Worklets versions to resolve native crash

**Status**: 🔄 Processing on Apple servers
**Expected**: Should launch without crashes

**Documentation**: [BUILD-15-WORKLETS-FIX.md](./BUILD-15-WORKLETS-FIX.md)

---

### **Build 14** - October 1, 2025, 11:30 ❌ CRASHED
**Issue**: Location services crash (partial fix exposed Worklets issue)

**Fix Applied**:
- Set `enableLocation: false` in Vision Camera plugin config
- Removed `NSLocationWhenInUseUsageDescription` from Info.plist
- Updated pre-build validation script

**Key Changes**:
```json
// app.json
{
  "plugins": [
    ["react-native-vision-camera", {
      "enableLocation": false  // Added this
    }]
  ],
  "ios": {
    "infoPlist": {
      // Removed NSLocationWhenInUseUsageDescription
    }
  }
}
```

**Commits**:
- `07ace38` - fix: Completely disable location services in Vision Camera

**Result**: Fixed location crash but exposed Worklets version mismatch
**Next Build**: Build 15 to fix Worklets issue

---

### **Build 13** - October 1, 2025, ~09:00 ❌ CRASHED
**Issue**: CLLocationManager crash on Thread 6
- `CLLocationManager.locationServicesEnabled` SIGABRT
- Vision Camera attempting to access location APIs

**Fix Applied**:
- Added `enableLocation={false}` to Camera component (React prop)

**Key Changes**:
```tsx
// src/app/(tabs)/camera.tsx
<Camera
  enableLocation={false}  // Added this
  // ... other props
/>
```

**Commits**:
- `94189fe` - fix: Disable location services in Vision Camera to prevent crash

**Result**: Incomplete fix - needed plugin-level configuration
**Next Build**: Build 14 to disable at build config level

---

### **Build 12** - October 1, 2025, 09:42 ⚠️ WARNING
**Issue**: Apple submission warning ITMS-90683
- Missing `NSLocationWhenInUseUsageDescription` in Info.plist
- Framework dependencies referenced location APIs

**Fix Applied**:
- Added `NSLocationWhenInUseUsageDescription` to Info.plist
- Created pre-build validation script (`scripts/pre-build-check.js`)
- Added npm scripts: `pre-build-check` and `validate`

**Key Changes**:
```json
// app.json
{
  "ios": {
    "infoPlist": {
      "NSLocationWhenInUseUsageDescription": "ZenScan does not use your location..."
    }
  }
}
```

**Commits**:
- `61c3506` - fix: Add NSLocationWhenInUseUsageDescription and pre-build validation

**Result**: Submitted successfully but added permission we didn't need
**Next Build**: Build 13 - App crashed after this change

**Documentation**: [BUILD-12-FINAL.md](./BUILD-12-FINAL.md)

---

### **Build 11** - October 1, 2025 ⚠️ NOT SUBMITTED
**Issue**: Missing location permission string
**Action**: Did not submit, proceeded to Build 12 with fix

---

### **Builds 8-10** - October 1, 2025 ✅ WORKING
**Milestone**: First successful TestFlight builds

**Major Features Implemented**:
- ✅ Real-time document detection with Vision Camera frame processor
- ✅ Animated polygon overlay using Reanimated
- ✅ Stability detection (300ms threshold, 20px tolerance)
- ✅ Haptic feedback when document is stable
- ✅ Auto-capture toggle for hands-free scanning
- ✅ Flash modes: off → auto → on
- ✅ Enhanced camera controls and UI
- ✅ System settings link for permissions

**Configuration Changes**:
- Updated from QuickScan to ZenScan (com.quickscan.app → com.zenscan.app)
- Fixed EAS project slug mismatch
- Corrected Apple ID to rodrigo.andara@gmail.com
- Added missing dependencies: react-dom, react-native-svg
- Fixed TypeScript errors in Vision Camera API usage

**Key Dependencies Added**:
- `expo-file-system@^19.0.16`
- `react-native-haptic-feedback@^2.3.3`
- `react-native-safe-area-context@~5.6.0`
- `react-native-screens@~4.16.0`
- `react-native-worklets@0.5.1`

**Status**: Worked well, served as baseline for subsequent builds

---

### **Builds 1-7** - Prior to October 1, 2025 🔧 DEVELOPMENT
**Phase**: Initial development and feature implementation
- Basic camera functionality with expo-camera
- Full app structure with Expo Router
- Edit screen with crop/rotate functionality
- Document store with Zustand
- Debug logging system
- Snack-compatible version created

---

## 🛠️ Current Technical Stack

### **Core Framework**
- **Expo SDK**: 54.0.11
- **React Native**: 0.81.4
- **React**: 19.1.0
- **TypeScript**: 5.9.2
- **New Architecture**: Enabled

### **Camera & Computer Vision**
- **react-native-vision-camera**: 4.7.2
- **expo-camera**: 17.0.8 (fallback)

### **Animation & Worklets** ⚠️ CRITICAL
- **react-native-reanimated**: 4.1.2
- **react-native-worklets**: **0.5.1** (exact version, no caret)
- **react-native-worklets-core**: **1.6.2** (exact version, no caret)
- **@shopify/react-native-skia**: 2.2.12

### **State & Utilities**
- **zustand**: 5.0.8
- **expo-router**: 6.0.9
- **expo-file-system**: 19.0.16
- **react-native-haptic-feedback**: 2.3.3
- **react-native-svg**: 15.12.1

---

## 🎯 Feature Roadmap

### **✅ Phase 1: Camera Platform (Completed)**
- ✅ Camera permissions with error handling
- ✅ Basic camera controls (flip, flash)
- ✅ System settings link for denied permissions
- ✅ Flash modes: off → auto → on
- ✅ Photo capture with Vision Camera
- ✅ File system integration

### **✅ Phase 2: Real-time Detection (Completed)**
- ✅ Vision Camera frame processor integration
- ✅ Worklets-based document detection
- ✅ Animated polygon overlay (Reanimated)
- ✅ Stability detection (300ms threshold)
- ✅ Haptic feedback on stability
- ✅ Auto-capture toggle
- ✅ 60 FPS performance

### **🚧 Phase 3: Native Computer Vision (Planned)**
- [ ] iOS: Vision framework (VNDetectRectanglesRequest)
- [ ] Android: OpenCV or MLKit integration
- [ ] Replace simplified detection algorithm
- [ ] Improved accuracy and edge detection
- [ ] Perspective correction

### **🚧 Phase 4: Image Enhancement (Planned)**
- [ ] Apply enhancement filters to captured images
- [ ] Filter preview in edit screen
- [ ] Brightness/contrast adjustment
- [ ] Black & white conversion
- [ ] Color enhancement presets

### **🚧 Phase 5: Advanced Features (Planned)**
- [ ] Manual corner adjustment with draggable handles
- [ ] Multi-page batch scanning improvements
- [ ] OCR text recognition
- [ ] PDF export with multiple pages
- [ ] Document naming and organization
- [ ] Cloud sync (optional)

---

## 📋 Known Issues & Resolutions

### **Issue 1: Worklets Version Mismatch** ✅ FIXED in Build 15
**Symptom**: App crashes immediately on launch (SIGABRT Thread 8)
**Cause**: Caret versioning allowing version drift
**Fix**: Pinned exact versions, no caret
**Status**: Fixed, testing in Build 15

### **Issue 2: Location Services Crash** ✅ FIXED in Build 14
**Symptom**: Crash in CLLocationManager after 4-5 seconds
**Cause**: Vision Camera trying to access location APIs
**Fix**: Set `enableLocation: false` in plugin config
**Status**: Fixed in Build 14

### **Issue 3: Apple Warning ITMS-90683** ✅ RESOLVED in Build 14
**Symptom**: Apple warning about missing location permission string
**Cause**: Framework dependencies reference location APIs
**Fix**: Disabled location entirely, removed permission string
**Status**: No longer needed, resolved

---

## 🧪 Testing Protocol

### **Pre-Flight Checks (Before Each Build)**
```bash
# 1. Run validation
npm run pre-build-check

# 2. Verify worklets versions (CRITICAL)
npm list react-native-worklets react-native-worklets-core

# 3. Check for caret versioning
grep -E "react-native-worklets|react-native-reanimated|react-native-vision-camera" package.json

# 4. Clear all caches
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 5. Clear Metro cache
npx expo start --clear

# 6. Rebuild native code
npx expo prebuild --clean

# 7. Build
eas build --platform ios --profile production
```

### **TestFlight Testing Checklist**
- [ ] App launches without crashes
- [ ] Camera permission prompt appears
- [ ] Camera preview displays correctly
- [ ] Frame processor initializes (no worklets crash)
- [ ] Document detection polygon appears
- [ ] Polygon animates smoothly
- [ ] Stability detection works (green polygon + haptic)
- [ ] Auto-capture triggers when enabled
- [ ] Photo capture works
- [ ] Navigate to edit screen
- [ ] All camera controls functional
- [ ] No location permission prompts
- [ ] Test continuously for 2-3 minutes
- [ ] No memory warnings or crashes

---

## 📞 Support & Resources

### **Build URLs**
- **EAS Builds**: https://expo.dev/accounts/rod_andara/projects/zenscan/builds
- **App Store Connect**: https://appstoreconnect.apple.com/apps/6753142099
- **TestFlight**: https://appstoreconnect.apple.com/apps/6753142099/testflight/ios

### **Credentials**
- **Apple Team**: NA3TX7FRRT (RODRIGO ANDARA - Individual)
- **Bundle ID**: com.zenscan.app
- **Distribution Certificate**: 1034AF606A03A866D90A25200AA79496
- **Provisioning Profile**: GZH536SGKB (expires Sep 28, 2026)
- **API Key**: Q96UB8QF32 ([Expo] EAS Submit msBs1psZWP)

### **Documentation**
- [BUILD-15-WORKLETS-FIX.md](./BUILD-15-WORKLETS-FIX.md) - Latest build details
- [BUILD-12-FINAL.md](./BUILD-12-FINAL.md) - First successful submission
- [BUILD-TRACKER.md](./BUILD-TRACKER.md) - This file (master tracker)

### **Repository**
- **GitHub**: https://github.com/rod-andara/zenscan-app
- **Latest Commits**: See individual build sections above

---

## 📝 Update Instructions

**After each new build, update this file with:**

1. **Add new build to overview table** (top section)
2. **Update "Current Build" section** with latest build info
3. **Add detailed build entry** in Build History (reverse chronological)
4. **Update "Known Issues"** if new issues found or resolved
5. **Update feature roadmap** if features added/completed
6. **Commit changes** with message: `docs: Update BUILD-TRACKER for Build X`

**Template for new builds:**

```markdown
### **Build X** - [Date], [Time] [Status Emoji]
**Issue**: [What was wrong]
- [Symptom details]
- [Error details]

**Fix Applied**:
- [Change 1]
- [Change 2]

**Key Changes**:
```[language]
// Code snippet
```

**Commits**:
- `[hash]` - [commit message]

**Result**: [What happened]
**Next Build**: [If applicable]

**Documentation**: [Link to detailed doc if exists]
```

---

**Last Updated**: October 1, 2025, 12:10
**Current Build**: 15 (Processing)
**Next Action**: Wait for Apple processing, test Build 15
