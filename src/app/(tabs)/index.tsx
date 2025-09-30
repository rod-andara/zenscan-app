import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { useDocumentStore } from '../../stores/documentStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { Document, Page } from '../../types';
import { debugLogger } from '../../utils/debugLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [capturedPages, setCapturedPages] = useState<Page[]>([]);
  const [detecting, setDetecting] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  const addDocument = useDocumentStore((state) => state.addDocument);
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);
  const isPremium = useSubscriptionStore((state) => state.isPremium);
  const checkFeatureAccess = useSubscriptionStore((state) => state.checkFeatureAccess);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Quick Scan needs camera access to scan documents
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCapture = async () => {
    debugLogger.info('📸 Capture button pressed');
    if (!cameraRef.current) {
      debugLogger.error('Camera ref not available');
      return;
    }

    // Pulse animation for feedback
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });

      if (!photo) {
        debugLogger.warn('No photo returned from camera');
        return;
      }

      debugLogger.success('Photo captured', {
        width: photo.width,
        height: photo.height,
      });

      const newPage: Page = {
        id: Date.now().toString(),
        uri: photo.uri,
        originalUri: photo.uri,
        width: photo.width,
        height: photo.height,
        order: capturedPages.length,
      };

      if (isBatchMode && checkFeatureAccess('batch')) {
        // Add to batch
        debugLogger.info('Adding to batch', { pageCount: capturedPages.length + 1 });
        setCapturedPages([...capturedPages, newPage]);
      } else {
        // Single page - create document and go to edit
        const newDocument: Document = {
          id: Date.now().toString(),
          title: `Document ${new Date().toLocaleDateString()}`,
          pages: [newPage],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        debugLogger.info('Creating new document', {
          id: newDocument.id,
          title: newDocument.title,
        });
        addDocument(newDocument);
        setCurrentDocument(newDocument);
        debugLogger.info('Navigating to edit screen');
        router.push('/edit/');
      }
    } catch (error) {
      debugLogger.error('Error capturing photo', error);
    }
  };

  const handleBatchComplete = () => {
    if (capturedPages.length === 0) return;

    const newDocument: Document = {
      id: Date.now().toString(),
      title: `Document ${new Date().toLocaleDateString()}`,
      pages: capturedPages,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addDocument(newDocument);
    setCurrentDocument(newDocument);
    setCapturedPages([]);
    router.push('/edit/');
  };

  const toggleBatchMode = () => {
    if (!checkFeatureAccess('batch')) {
      // TODO: Show paywall
      return;
    }
    setIsBatchMode(!isBatchMode);
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back" />

      {/* Document detection overlay */}
      <View style={styles.overlay}>
        <View style={styles.detectionFrame}>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>
      </View>

      {/* Top controls */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={[styles.batchButton, isBatchMode && styles.batchButtonActive]}
          onPress={toggleBatchMode}
        >
          <Text style={styles.batchButtonText}>
            {isBatchMode ? `Batch (${capturedPages.length})` : 'Single'}
          </Text>
          {!checkFeatureAccess('batch') && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {isBatchMode && capturedPages.length > 0 && (
          <TouchableOpacity style={styles.doneButton} onPress={handleBatchComplete}>
            <Text style={styles.doneButtonText}>Done ({capturedPages.length})</Text>
          </TouchableOpacity>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </Animated.View>

        {isBatchMode && capturedPages.length > 0 && <View style={styles.spacer} />}
      </View>

      {/* Hint text */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>Position document within frame</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectionFrame: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.6,
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
  topControls: {
    position: 'absolute',
    top: spacing.xl + spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  batchButtonActive: {
    backgroundColor: colors.primary.teal,
  },
  batchButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
  premiumBadge: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  premiumBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.primary.dark,
    fontWeight: '700',
  },
  bottomControls: {
    position: 'absolute',
    bottom: spacing.xxl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
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
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  doneButton: {
    backgroundColor: colors.primary.purple,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  doneButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
  spacer: {
    width: 120,
  },
  hintContainer: {
    position: 'absolute',
    bottom: spacing.xl + 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    ...typography.caption,
    color: colors.text.primary.dark,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
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
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
});
