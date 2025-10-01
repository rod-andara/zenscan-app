import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { useDocumentStore } from '../../stores/documentStore';
import { debugLogger } from '../../utils/debugLogger';
import { ScanMode } from '../../utils/documentDetection';
import { Document, Page } from '../../types';
import { createDefaultEdits } from '../../utils/imageEdits';

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

  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on' | 'auto'>('off');
  const [scanMode, setScanMode] = useState<ScanMode>('document');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(cameraPosition);

  const addDocument = useDocumentStore((state) => state.addDocument);
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

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
      });

      debugLogger.success('Photo captured', {
        width: photo.width,
        height: photo.height,
        path: photo.path.substring(0, 50) + '...',
      });

      const photoUri = `file://${photo.path}`;

      const newPage: Page = {
        id: Date.now().toString(),
        uri: photoUri,
        processedUri: photoUri,
        originalUri: photoUri,
        width: photo.width,
        height: photo.height,
        order: 0,
        edits: createDefaultEdits(),
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
            ZenScan needs camera access to scan documents
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
        enableLocation={false}
      />

      <View style={styles.detectionHintContainer}>
        <Text style={styles.detectionHint}>Position document in view and tap capture</Text>
      </View>

      <View style={styles.topControls}>
        <View style={styles.flashContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleFlash}>
            <Text style={styles.iconButtonText}>⚡</Text>
            {flash !== 'off' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          {flash !== 'off' && <Text style={styles.flashLabel}>{flash.toUpperCase()}</Text>}
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

      <View style={styles.bottomControls}>
        <View style={styles.leftControl}>
          <TouchableOpacity style={styles.iconButton} onPress={toggleCamera}>
            <Text style={styles.iconButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={styles.rightControl} />
      </View>

      <View style={styles.statusBarSafeArea} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  permissionIcon: {
    fontSize: 48,
  },
  permissionTitle: {
    ...typography.title3,
    color: colors.text.primary.dark,
    textAlign: 'center',
  },
  permissionText: {
    ...typography.body,
    color: colors.text.secondary.dark,
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
  settingsButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  settingsButtonText: {
    ...typography.button,
    color: colors.text.secondary.dark,
  },
  errorText: {
    ...typography.body,
    color: colors.text.primary.dark,
    textAlign: 'center',
    padding: spacing.xl,
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
  leftControl: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightControl: {
    flex: 1,
    alignItems: 'flex-end',
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
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.text.primary.dark,
  },
  statusBarSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 44 : 0,
  },
});
