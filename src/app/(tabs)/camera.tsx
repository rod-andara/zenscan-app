import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { useDocumentStore } from '../../stores/documentStore';
import { debugLogger } from '../../utils/debugLogger';
import { ScanMode, detectDocumentEdges, DetectedDocument } from '../../utils/documentDetection';
import { Document, Page } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SCAN_MODES: { id: ScanMode; label: string; icon: string }[] = [
  { id: 'document', label: 'Document', icon: '📄' },
  { id: 'receipt', label: 'Receipt', icon: '🧾' },
  { id: 'businessCard', label: 'Card', icon: '💳' },
  { id: 'whiteboard', label: 'Board', icon: '📋' },
  { id: 'photo', label: 'Photo', icon: '📷' },
];

export default function CameraScreen() {
  const router = useRouter();
  const cameraRef = useRef<Camera>(null);

  const [scanMode, setScanMode] = useState<ScanMode>('document');
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [detectedDoc, setDetectedDoc] = useState<DetectedDocument | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const addDocument = useDocumentStore((state) => state.addDocument);
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Simulate edge detection every 500ms (simple mock - not using frame processors)
  useEffect(() => {
    const interval = setInterval(() => {
      // Mock detection with random confidence
      const mockConfidence = 0.5 + Math.random() * 0.5;
      const detected = detectDocumentEdges(SCREEN_WIDTH, SCREEN_HEIGHT);
      setDetectedDoc({ ...detected, confidence: mockConfidence });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) {
      debugLogger.warn('Camera not ready or already capturing');
      return;
    }

    setIsCapturing(true);
    debugLogger.info('📸 Capturing photo');

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
  }, [flash, isCapturing, scanMode, addDocument, setCurrentDocument, router]);

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

  const isWellAligned = detectedDoc && detectedDoc.confidence > 0.75;
  const qualityPercentage = detectedDoc ? Math.round(detectedDoc.confidence * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* Edge Detection Overlay */}
      {detectedDoc && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Document border */}
          <View
            style={[
              styles.detectionBorder,
              {
                borderColor: isWellAligned ? colors.status.success : colors.primary.teal,
                borderWidth: isWellAligned ? 4 : 2,
                left: detectedDoc.corners[0].x * 0.8,
                top: detectedDoc.corners[0].y * 0.7,
                width: (detectedDoc.corners[1].x - detectedDoc.corners[0].x) * 0.8,
                height: (detectedDoc.corners[3].y - detectedDoc.corners[0].y) * 0.7,
              },
            ]}
          />

          {/* Corner markers */}
          {detectedDoc.corners.map((corner, index) => (
            <View
              key={index}
              style={[
                styles.cornerMarker,
                {
                  left: corner.x * 0.8 - 8,
                  top: corner.y * 0.7 - 8,
                  backgroundColor: isWellAligned ? colors.status.success : colors.primary.teal,
                },
              ]}
            />
          ))}
        </View>
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
            isWellAligned && styles.captureButtonReady,
            isCapturing && styles.captureButtonDisabled,
          ]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
        {isWellAligned && (
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
  detectionBorder: {
    position: 'absolute',
    borderRadius: borderRadius.md,
  },
  cornerMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
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
