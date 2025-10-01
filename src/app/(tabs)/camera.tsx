import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as FileSystem from 'expo-file-system';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { useDocumentStore } from '../../stores/documentStore';
import { debugLogger } from '../../utils/debugLogger';
import { detectDocumentEdges, ScanMode, enhancementPresets } from '../../utils/documentDetection';
import { Document, Page } from '../../types';
import { DocumentDetectionOverlay } from '../../components/DocumentDetectionOverlay';
import {
  DetectedRectangle,
  detectRectangleInFrame,
  isRectangleStable,
  isRectangleLargeEnough,
} from '../../utils/documentFrameProcessor';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SCAN_MODES: { id: ScanMode; label: string; icon: string }[] = [
  { id: 'document', label: 'Document', icon: '📄' },
  { id: 'receipt', label: 'Receipt', icon: '🧾' },
  { id: 'businessCard', label: 'Card', icon: '💳' },
  { id: 'whiteboard', label: 'Board', icon: '📋' },
  { id: 'photo', label: 'Photo', icon: '📷' },
];

const STABILITY_THRESHOLD = 300; // ms
const STABILITY_DISTANCE = 20; // pixels

export default function EnhancedCameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);

  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [scanMode, setScanMode] = useState<ScanMode>('document');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [autoCapture, setAutoCapture] = useState(false);
  const [detectedCorners, setDetectedCorners] = useState<[any, any, any, any] | null>(null);
  const [isStable, setIsStable] = useState(false);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(cameraPosition);

  const addDocument = useDocumentStore((state) => state.addDocument);
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);

  // Shared values for frame processor
  const lastDetection = useSharedValue<DetectedRectangle | null>(null);
  const stableStartTime = useSharedValue<number>(0);
  const hasTriggeredHaptic = useSharedValue<boolean>(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Callbacks from frame processor (must be wrapped with runOnJS)
  const onDetectionUpdate = useCallback((corners: [any, any, any, any] | null) => {
    setDetectedCorners(corners);
  }, []);

  const onStabilityChange = useCallback((stable: boolean) => {
    setIsStable(stable);
  }, []);

  const triggerHaptic = useCallback(() => {
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  }, []);

  const triggerAutoCapture = useCallback(() => {
    if (autoCapture && !isCapturing) {
      debugLogger.info('Auto-capture triggered');
      handleCapture();
    }
  }, [autoCapture, isCapturing]);

  // Real-time frame processor
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    const detected = detectRectangleInFrame(frame);

    if (detected && isRectangleLargeEnough(detected.corners, frame.width, frame.height)) {
      // Update detection on main thread
      runOnJS(onDetectionUpdate)(detected.corners);

      // Check stability
      const stable = isRectangleStable(detected, lastDetection.value, STABILITY_DISTANCE);

      if (stable) {
        const now = Date.now();
        if (stableStartTime.value === 0) {
          stableStartTime.value = now;
        } else if (now - stableStartTime.value >= STABILITY_THRESHOLD) {
          runOnJS(onStabilityChange)(true);

          // Trigger haptic once when stable
          if (!hasTriggeredHaptic.value) {
            runOnJS(triggerHaptic)();
            hasTriggeredHaptic.value = true;

            // Trigger auto-capture if enabled
            runOnJS(triggerAutoCapture)();
          }
        }
      } else {
        stableStartTime.value = 0;
        hasTriggeredHaptic.value = false;
        runOnJS(onStabilityChange)(false);
      }

      lastDetection.value = detected;
    } else {
      runOnJS(onDetectionUpdate)(null);
      runOnJS(onStabilityChange)(false);
      stableStartTime.value = 0;
      hasTriggeredHaptic.value = false;
    }
  }, [autoCapture, isCapturing]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) {
      debugLogger.warn('Camera not ready or already capturing');
      return;
    }

    setIsCapturing(true);
    debugLogger.info('📸 Capturing photo with Vision Camera');

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: flash,
        quality: 90,
        skipMetadata: true,
      });

      debugLogger.success('Photo captured', {
        width: photo.width,
        height: photo.height,
        path: photo.path.substring(0, 50) + '...',
      });

      // Detect document edges
      const detection = detectDocumentEdges(photo.width, photo.height);
      debugLogger.info('Document edges detected', {
        confidence: detection.confidence,
      });

      const newPage: Page = {
        id: Date.now().toString(),
        uri: `file://${photo.path}`,
        originalUri: `file://${photo.path}`,
        width: photo.width,
        height: photo.height,
        order: 0,
      };

      const newDocument: Document = {
        id: Date.now().toString(),
        title: `${SCAN_MODES.find((m) => m.id === scanMode)?.label} ${new Date().toLocaleDateString()}`,
        pages: [newPage],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      debugLogger.info('Creating document', {
        id: newDocument.id,
        scanMode,
      });

      addDocument(newDocument);
      setCurrentDocument(newDocument);

      // Navigate to edit screen
      router.push('/edit/');
    } catch (error) {
      debugLogger.error('Failed to capture photo', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  }, [flash, scanMode, isCapturing, addDocument, setCurrentDocument, router]);

  const toggleFlash = useCallback(() => {
    setFlash((current) => {
      if (current === 'off') return 'auto';
      if (current === 'auto') return 'on';
      return 'off';
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraPosition((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const handleNavigateToDocuments = useCallback(() => {
    router.push('/(tabs)/documents');
  }, [router]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            ZenScan needs camera access to scan documents with advanced edge detection
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        enableZoomGesture={true}
        frameProcessor={frameProcessor}
      />

      {/* Animated document detection overlay */}
      {detectedCorners && device && (
        <DocumentDetectionOverlay
          corners={detectedCorners}
          isStable={isStable}
          frameWidth={device.formats[0]?.videoWidth || SCREEN_WIDTH}
          frameHeight={device.formats[0]?.videoHeight || SCREEN_HEIGHT}
          viewWidth={SCREEN_WIDTH}
          viewHeight={SCREEN_HEIGHT}
        />
      )}

      {/* Detection status hint */}
      <View style={styles.detectionHintContainer}>
        <Text style={[styles.detectionHint, isStable && styles.detectionHintStable]}>
          {isStable ? '✓ Document ready' : 'Position document in view'}
        </Text>
      </View>

      {/* Top controls */}
      <View style={styles.topControls}>
        <View style={styles.flashContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
            <Text style={styles.iconButtonText}>⚡</Text>
            {flash !== 'off' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          {flash !== 'off' && (
            <Text style={styles.flashLabel}>{flash.toUpperCase()}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.modeButton}
          onPress={() => setShowModeSelector(!showModeSelector)}
        >
          <Text style={styles.modeButtonIcon}>
            {SCAN_MODES.find((m) => m.id === scanMode)?.icon}
          </Text>
          <Text style={styles.modeButtonText}>
            {SCAN_MODES.find((m) => m.id === scanMode)?.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={handleNavigateToDocuments}>
          <Text style={styles.iconButtonText}>📁</Text>
        </TouchableOpacity>
      </View>

      {/* Scan mode selector */}
      {showModeSelector && (
        <View style={styles.modeSelectorContainer}>
          {SCAN_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.modeOption,
                scanMode === mode.id && styles.modeOptionActive,
              ]}
              onPress={() => {
                setScanMode(mode.id);
                setShowModeSelector(false);
              }}
            >
              <Text style={styles.modeOptionIcon}>{mode.icon}</Text>
              <Text style={styles.modeOptionText}>{mode.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <View style={styles.leftControl}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleCamera}>
            <Text style={styles.iconButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.captureButton,
            isCapturing && styles.captureButtonDisabled,
            isStable && styles.captureButtonReady,
          ]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={styles.rightControl}>
          <View style={styles.autoCaptureSwitchContainer}>
            <Text style={styles.autoCaptureSwitchLabel}>Auto</Text>
            <Switch
              value={autoCapture}
              onValueChange={setAutoCapture}
              trackColor={{ false: '#767577', true: colors.primary.teal }}
              thumbColor={autoCapture ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
      </View>

      {/* Status bar safe area */}
      <View style={styles.statusBarSafeArea} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectionFrame: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.65,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary.teal,
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: borderRadius.md,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: borderRadius.md,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: borderRadius.md,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: borderRadius.md,
  },
  detectionHintContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  detectionHint: {
    ...typography.caption,
    color: colors.text.primary.dark,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  detectionHintStable: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconButtonText: {
    fontSize: 24,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.teal,
  },
  flashContainer: {
    alignItems: 'center',
  },
  flashLabel: {
    ...typography.caption,
    color: colors.text.primary.dark,
    fontSize: 10,
    marginTop: 2,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  modeButtonIcon: {
    fontSize: 20,
  },
  modeButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
    fontSize: 14,
  },
  modeSelectorContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modeOption: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeOptionActive: {
    backgroundColor: colors.primary.teal,
  },
  modeOptionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  modeOptionText: {
    ...typography.caption,
    color: colors.text.primary.dark,
    fontSize: 11,
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonReady: {
    borderColor: colors.status.success,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  leftControl: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightControl: {
    flex: 1,
    alignItems: 'flex-end',
  },
  autoCaptureSwitchContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.md,
    padding: spacing.xs,
  },
  autoCaptureSwitchLabel: {
    ...typography.caption,
    color: colors.text.primary.dark,
    fontSize: 10,
    marginBottom: 2,
  },
  statusBarSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 44 : 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    ...typography.heading,
    color: colors.text.primary.dark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body,
    color: colors.text.secondary.dark,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary.teal,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
  settingsButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  settingsButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
    fontSize: 14,
  },
  errorText: {
    ...typography.body,
    color: colors.text.primary.dark,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
