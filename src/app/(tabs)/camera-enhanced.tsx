/**
 * Enhanced Camera Screen with Document Scanner Integration
 *
 * CRITICAL: Uses react-native-document-scanner-plugin (NO frame processors)
 * This approach is stable in production builds unlike Vision Camera worklets
 *
 * NOTE: The quality indicators and auto-capture utilities are ready for
 * future integration when a real-time detection solution is available.
 * For now, we use the native scanner plugin which handles detection internally.
 */

import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { useDocumentStore } from '../../stores/documentStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { Document, Page } from '../../types';
import { debugLogger } from '../../utils/debugLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraEnhancedScreen() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [scannedPages, setScannedPages] = useState<Page[]>([]);

  const addDocument = useDocumentStore((state) => state.addDocument);
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);
  const checkFeatureAccess = useSubscriptionStore((state) => state.checkFeatureAccess);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const handleScan = async () => {
    if (isScanning) return;

    setIsScanning(true);
    debugLogger.info('📸 Starting document scan with native plugin');

    // Pulse animation for feedback
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.9,
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
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: isBatchMode ? 10 : 1,
        croppedImageQuality: 100,
      });

      if (scannedImages && scannedImages.length > 0) {
        debugLogger.success('Document(s) scanned', { count: scannedImages.length });

        // Convert scanned images to pages
        const newPages: Page[] = scannedImages.map((uri, index) => ({
          id: `${Date.now()}-${index}`,
          uri,
          originalUri: uri,
          width: 2000, // Plugin doesn't return dimensions, use defaults
          height: 2000,
          order: scannedPages.length + index,
          edits: {
            rotation: 0,
            brightness: 0,
            contrast: 1,
            saturation: 1,
            sharpness: 1,
            cropCorners: [
              { x: 0.05, y: 0.05 },
              { x: 0.95, y: 0.05 },
              { x: 0.95, y: 0.95 },
              { x: 0.05, y: 0.95 },
            ],
            preset: 'none',
          },
        }));

        if (isBatchMode && checkFeatureAccess('batch')) {
          // Add to batch
          debugLogger.info('Adding to batch', { pageCount: scannedPages.length + newPages.length });
          setScannedPages([...scannedPages, ...newPages]);
        } else {
          // Single page - create document and go to edit
          const newDocument: Document = {
            id: Date.now().toString(),
            title: `Scan ${new Date().toLocaleDateString()}`,
            pages: newPages,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          debugLogger.info('Creating new document', {
            id: newDocument.id,
            pageCount: newPages.length,
          });
          addDocument(newDocument);
          setCurrentDocument(newDocument);
          router.push('/edit/');
        }
      } else {
        debugLogger.warn('No document scanned');
      }
    } catch (error: any) {
      if (error.message !== 'User canceled document scan') {
        debugLogger.error('Scan failed', error);
        Alert.alert('Scan Failed', 'Unable to scan document. Please try again.');
      } else {
        debugLogger.info('User canceled scan');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleBatchComplete = () => {
    if (scannedPages.length === 0) return;

    const newDocument: Document = {
      id: Date.now().toString(),
      title: `Scan ${new Date().toLocaleDateString()}`,
      pages: scannedPages,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    debugLogger.info('Creating batch document', {
      id: newDocument.id,
      pageCount: scannedPages.length,
    });
    addDocument(newDocument);
    setCurrentDocument(newDocument);
    setScannedPages([]);
    setIsBatchMode(false);
    router.push('/edit/');
  };

  const toggleBatchMode = () => {
    if (!checkFeatureAccess('batch')) {
      Alert.alert(
        'Premium Feature',
        'Batch scanning is available with ZenScan Pro. Upgrade to scan multiple pages at once.',
        [{ text: 'OK' }]
      );
      return;
    }
    setIsBatchMode(!isBatchMode);
    if (!isBatchMode) {
      setScannedPages([]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Document Scanner</Text>
        <Text style={styles.subtitle}>
          {isBatchMode
            ? 'Batch mode - scan multiple pages'
            : 'Tap to scan with auto edge detection'}
        </Text>
      </View>

      {/* Top controls */}
      <View style={styles.topControls}>
        <TouchableOpacity
          style={[styles.batchButton, isBatchMode && styles.batchButtonActive]}
          onPress={toggleBatchMode}
        >
          <Text style={styles.batchButtonText}>
            {isBatchMode ? `Batch (${scannedPages.length})` : 'Single'}
          </Text>
          {!checkFeatureAccess('batch') && (
            <View style={styles.premiumBadge}>
              <Text style={styles.premiumBadgeText}>PRO</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Center content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📄</Text>
          <Text style={styles.instructionText}>
            {isBatchMode
              ? `${scannedPages.length} page${scannedPages.length !== 1 ? 's' : ''} scanned`
              : 'Professional document scanning'}
          </Text>
          <Text style={styles.subInstructionText}>
            • Automatic edge detection
          </Text>
          <Text style={styles.subInstructionText}>
            • Manual corner adjustment
          </Text>
          <Text style={styles.subInstructionText}>
            • High-quality output
          </Text>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        {isBatchMode && scannedPages.length > 0 && (
          <TouchableOpacity style={styles.doneButton} onPress={handleBatchComplete}>
            <Text style={styles.doneButtonText}>Done ({scannedPages.length})</Text>
          </TouchableOpacity>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
            onPress={handleScan}
            disabled={isScanning}
          >
            <View style={styles.scanButtonInner}>
              <Text style={styles.scanButtonIcon}>
                {isScanning ? '⏳' : '📷'}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {isBatchMode && scannedPages.length > 0 && <View style={styles.spacer} />}
      </View>

      {/* Hint text */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>
          {isScanning
            ? 'Scanning document...'
            : isBatchMode && scannedPages.length > 0
            ? 'Tap to add another page or press Done'
            : 'Tap the camera button to start scanning'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.primary.dark,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary.dark,
  },
  topControls: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 14,
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconContainer: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: spacing.xl,
  },
  instructionText: {
    fontSize: 18,
    color: colors.text.primary.dark,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  subInstructionText: {
    fontSize: 14,
    color: colors.text.secondary.dark,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  bottomControls: {
    paddingBottom: spacing.xxl,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  scanButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.teal,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButtonIcon: {
    fontSize: 32,
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
    width: 100,
  },
  hintContainer: {
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  hintText: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    textAlign: 'center',
  },
});
