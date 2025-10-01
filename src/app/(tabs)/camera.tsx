import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { useDocumentStore } from '../../stores/documentStore';
import { debugLogger } from '../../utils/debugLogger';
import { ScanMode } from '../../utils/documentDetection';
import { Document, Page, Point } from '../../types';
import { DocumentDetectionOverlay } from '../../components/DocumentDetectionOverlay';
import {
  DetectedRectangle,
  detectRectangleInFrame,
  isRectangleStable,
  isRectangleLargeEnough,
} from '../../utils/documentFrameProcessor';
import { applyPerspectiveCorrection, validateCorners, createDefaultCorners } from '../../utils/perspectiveCorrection';
import { createDefaultEdits } from '../../utils/imageEdits';

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

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);

  const [scanMode, setScanMode] = useState<ScanMode>('document');
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [detectedCorners, setDetectedCorners] = useState<[Point, Point, Point, Point] | null>(null);
  const [isStable, setIsStable] = useState(false);
  const [detectionConfidence, setDetectionConfidence] = useState(0);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

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

  // Callbacks from frame processor
  const onDetectionUpdate = useCallback((corners: [Point, Point, Point, Point] | null, confidence: number) => {
    setDetectedCorners(corners);
    setDetectionConfidence(confidence);
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

  // Real-time frame processor
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    const detected = detectRectangleInFrame(frame);

    if (detected && isRectangleLargeEnough(detected.corners, frame.width, frame.height)) {
      runOnJS(onDetectionUpdate)(detected.corners, detected.confidence);

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
          }
        }
      } else {
        stableStartTime.value = 0;
        hasTriggeredHaptic.value = false;
        runOnJS(onStabilityChange)(false);
      }

      lastDetection.value = detected;
    } else {
      runOnJS(onDetectionUpdate)(null, 0);
      runOnJS(onStabilityChange)(false);
      stableStartTime.value = 0;
      hasTriggeredHaptic.value = false;
    }
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) {
      debugLogger.warn('Camera not ready or already capturing');
      return;
    }

    // Require stable detection for better results
    if (!isStable && detectionConfidence < 0.6) {
      debugLogger.warn('Detection not stable enough, waiting...');
      Alert.alert('Hold Steady', 'Please hold your device steady and ensure the document is fully visible.');
      return;
    }

    setIsCapturing(true);
    debugLogger.info('📸 Capturing photo with Vision Camera');

    try {
      const photo = await cameraRef.current.takePhoto({
        flash: flash,
        enableShutterSound: true,
      });

      debugLogger.success('Photo captured', {
        width: photo.width,
        height: photo.height,
        path: photo.path.substring(0, 50) + '...',
      });

      const originalUri = `file://${photo.path}`;

      // Use detected corners or create default ones
      let corners = detectedCorners;
      let confidence = detectionConfidence;

      if (!corners || !validateCorners(corners)) {
        debugLogger.warn('Invalid or missing corners, using defaults');
        corners = createDefaultCorners(photo.width, photo.height);
        confidence = 0.5;
      }

      // Apply perspective correction
      debugLogger.info('Applying perspective correction...');
      const correctionResult = await applyPerspectiveCorrection(
        originalUri,
        corners,
        photo.width,
        photo.height
      );

      if (!correctionResult.success) {
        debugLogger.warn('Perspective correction failed, using original', { error: correctionResult.error });
      }

      // Create page with both original and processed URIs
      const newPage: Page = {
        id: Date.now().toString(),
        uri: correctionResult.correctedUri, // Use corrected as main
        processedUri: correctionResult.correctedUri,
        originalUri: originalUri, // Keep original for reprocessing
        width: correctionResult.width,
        height: correctionResult.height,
        order: 0,
        detectedCorners: correctionResult.appliedCorners,
        confidence: confidence,
        edits: createDefaultEdits(corners),
      };

      const newDocument: Document = {
        id: Date.now().toString(),
        title: `${SCAN_MODES.find((m) => m.id === scanMode)?.label} ${new Date().toLocaleDateString()}`,
        pages: [newPage],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      debugLogger.success('Document created with perspective correction', {
        id: newDocument.id,
        pages: newDocument.pages.length,
        corrected: correctionResult.success,
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
  }, [flash, isCapturing, scanMode, addDocument, setCurrentDocument, router, detectedCorners, detectionConfidence, isStable]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
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

  const qualityPercentage = Math.round(detectionConfidence * 100);

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        frameProcessor={frameProcessor}
      />

      {/* Edge Detection Overlay */}
      {detectedCorners && (
        <DocumentDetectionOverlay
          corners={detectedCorners}
          isStable={isStable}
          frameWidth={SCREEN_WIDTH}
          frameHeight={SCREEN_HEIGHT}
          viewWidth={SCREEN_WIDTH}
          viewHeight={SCREEN_HEIGHT}
        />
      )}

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topButton}
          onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}
        >
          <Text style={styles.topButtonText}>{flash === 'off' ? '⚡ Off' : '⚡ On'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.topButton}
          onPress={() => router.push('/(tabs)/documents')}
        >
          <Text style={styles.topButtonText}>📁 Docs</Text>
        </TouchableOpacity>
      </View>

      {/* Quality Indicator */}
      <View style={styles.qualityContainer}>
        <Text style={styles.qualityText}>Alignment Quality</Text>
        <View style={styles.qualityBarContainer}>
          <View
            style={[
              styles.qualityBar,
              {
                width: `${qualityPercentage}%`,
                backgroundColor:
                  qualityPercentage > 75
                    ? colors.status.success
                    : qualityPercentage > 50
                    ? colors.status.warning
                    : colors.status.error,
              },
            ]}
          />
        </View>
        <Text style={styles.qualityPercentage}>{qualityPercentage}%</Text>
      </View>

      {/* Scan Mode Selector */}
      <View style={styles.modeContainer}>
        <View style={styles.modeButtons}>
          {SCAN_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.modeButton,
                scanMode === mode.id && styles.modeButtonActive,
              ]}
              onPress={() => setScanMode(mode.id)}
            >
              <Text style={styles.modeIcon}>{mode.icon}</Text>
              <Text style={[
                styles.modeLabel,
                scanMode === mode.id && styles.modeLabelActive,
              ]}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Capture Button */}
      <View style={styles.captureContainer}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            isStable && styles.captureButtonReady,
            isCapturing && styles.captureButtonDisabled,
          ]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        {isStable && (
          <Text style={styles.captureHint}>✓ Ready to scan</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionText: {
    ...typography.body,
    color: colors.text.primary.dark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: colors.primary.teal,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
  errorText: {
    ...typography.body,
    color: colors.text.primary.dark,
    textAlign: 'center',
    padding: spacing.xl,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  topButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  topButtonText: {
    ...typography.button,
    color: 'white',
    fontSize: 14,
  },
  qualityContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 80,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  qualityText: {
    ...typography.caption,
    color: 'white',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  qualityBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  qualityBar: {
    height: '100%',
    borderRadius: 4,
  },
  qualityPercentage: {
    ...typography.caption,
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
  },
  modeContainer: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
  },
  modeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: borderRadius.full,
    padding: spacing.xs,
  },
  modeButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    minWidth: 60,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.3)',
  },
  modeIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  modeLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
  },
  modeLabelActive: {
    color: colors.primary.teal,
    fontWeight: '600',
  },
  captureContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonReady: {
    borderColor: colors.status.success,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  captureHint: {
    ...typography.caption,
    color: colors.status.success,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
});
