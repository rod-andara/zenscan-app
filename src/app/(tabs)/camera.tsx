import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { useDocumentStore } from '../../stores/documentStore';
import { debugLogger } from '../../utils/debugLogger';
import { ScanMode } from '../../utils/documentDetection';
import { Document, Page } from '../../types';

const SCAN_MODES: { id: ScanMode; label: string; icon: string; description: string }[] = [
  { id: 'document', label: 'Document', icon: '📄', description: 'Scan documents with auto edge detection' },
  { id: 'receipt', label: 'Receipt', icon: '🧾', description: 'Scan receipts and invoices' },
  { id: 'businessCard', label: 'Card', icon: '💳', description: 'Scan business cards' },
  { id: 'whiteboard', label: 'Board', icon: '📋', description: 'Scan whiteboards and notes' },
  { id: 'photo', label: 'Photo', icon: '📷', description: 'Take regular photos' },
];

export default function DocumentScannerScreen() {
  const router = useRouter();
  const [scanMode, setScanMode] = useState<ScanMode>('document');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const addDocument = useDocumentStore((state) => state.addDocument);
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);

  const handleScanDocument = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    debugLogger.info('📸 Starting document scanner', { scanMode });

    try {
      // Scan document with native scanner
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: scanMode === 'document' ? 5 : 1, // Allow multi-page for documents
        croppedImageQuality: 100, // Highest quality
        responseType: 'imageFilePath' as any, // Get file paths
      });

      if (!scannedImages || scannedImages.length === 0) {
        debugLogger.warn('No images scanned');
        return;
      }

      debugLogger.success('Document scanned', {
        numPages: scannedImages.length,
        scanMode,
      });

      // Create pages from scanned images
      const pages: Page[] = scannedImages.map((imagePath, index) => ({
        id: `${Date.now()}-${index}`,
        uri: imagePath,
        originalUri: imagePath,
        width: 0, // Will be determined in edit screen
        height: 0,
        order: index,
      }));

      // Create new document
      const newDocument: Document = {
        id: Date.now().toString(),
        title: `${SCAN_MODES.find((m) => m.id === scanMode)?.label} ${new Date().toLocaleDateString()}`,
        pages,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      debugLogger.info('Creating document', {
        id: newDocument.id,
        pages: pages.length,
        scanMode,
      });

      addDocument(newDocument);
      setCurrentDocument(newDocument);

      // Navigate to edit screen
      router.push('/edit/');
    } catch (error: any) {
      if (error.message === 'User canceled') {
        debugLogger.info('User canceled scan');
        return;
      }

      debugLogger.error('Failed to scan document', error);
      Alert.alert('Error', 'Failed to scan document. Please try again.');
    } finally {
      setIsScanning(false);
    }
  }, [scanMode, isScanning, addDocument, setCurrentDocument, router]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ZenScan</Text>
        <Text style={styles.headerSubtitle}>Native Document Scanner</Text>
      </View>

      {/* Scan mode selector */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Scan Mode</Text>

        <View style={styles.modesGrid}>
          {SCAN_MODES.map((mode) => (
            <TouchableOpacity
              key={mode.id}
              style={[
                styles.modeCard,
                scanMode === mode.id && styles.modeCardActive,
              ]}
              onPress={() => setScanMode(mode.id)}
            >
              <Text style={styles.modeCardIcon}>{mode.icon}</Text>
              <Text style={[
                styles.modeCardLabel,
                scanMode === mode.id && styles.modeCardLabelActive,
              ]}>
                {mode.label}
              </Text>
              <Text style={styles.modeCardDescription}>{mode.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Scan button */}
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={handleScanDocument}
          disabled={isScanning}
        >
          <Text style={styles.scanButtonIcon}>📸</Text>
          <Text style={styles.scanButtonText}>
            {isScanning ? 'Scanning...' : `Scan ${SCAN_MODES.find((m) => m.id === scanMode)?.label}`}
          </Text>
        </TouchableOpacity>

        {/* Features list */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Features:</Text>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Automatic edge detection</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Perspective correction</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>Multi-page scanning</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>✓</Text>
            <Text style={styles.featureText}>High quality output</Text>
          </View>
        </View>

        {/* Documents button */}
        <TouchableOpacity
          style={styles.documentsButton}
          onPress={() => router.push('/(tabs)/documents')}
        >
          <Text style={styles.documentsButtonText}>📁 View Documents</Text>
        </TouchableOpacity>
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
  statusBarSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 44 : 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary.teal,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 32,
    color: colors.text.primary.dark,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 20,
    color: colors.text.primary.dark,
    marginBottom: spacing.md,
  },
  modesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  modeCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderColor: colors.primary.teal,
  },
  modeCardIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  modeCardLabel: {
    ...typography.button,
    color: colors.text.primary.dark,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  modeCardLabelActive: {
    color: colors.primary.teal,
  },
  modeCardDescription: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    textAlign: 'center',
    fontSize: 11,
  },
  scanButton: {
    backgroundColor: colors.primary.teal,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonDisabled: {
    opacity: 0.5,
  },
  scanButtonIcon: {
    fontSize: 24,
  },
  scanButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
    fontSize: 18,
  },
  featuresContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    ...typography.button,
    color: colors.text.primary.dark,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureIcon: {
    color: colors.primary.teal,
    marginRight: spacing.sm,
    fontSize: 14,
  },
  featureText: {
    ...typography.body,
    color: colors.text.secondary.dark,
    fontSize: 14,
  },
  documentsButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  documentsButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
    fontSize: 16,
  },
});
