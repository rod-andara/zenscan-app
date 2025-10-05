import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { useDocumentStore } from '../../stores/documentStore';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { debugLogger } from '../../utils/debugLogger';
import { Slider } from '../../components/ui/Slider';
import { CropOverlay } from '../../components/edit/CropOverlay';
import { applyPreset, EDIT_PRESETS } from '../../utils/imageEdits';
import { CropCorner } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.5;

type PresetType = 'none' | 'blackAndWhite' | 'grayscale' | 'enhance';

export default function EditScreen() {
  const router = useRouter();
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const updateDocument = useDocumentStore((state) => state.updateDocument);

  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [showCropOverlay, setShowCropOverlay] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  if (!currentDocument || currentDocument.pages.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No document to edit</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentPage = currentDocument.pages[selectedPageIndex];
  const edits = currentPage.edits;
  const displayUri = previewUri || currentPage.uri;

  // Handle rotation
  const handleRotate = useCallback(() => {
    const newRotation = (edits.rotation + 90) % 360;
    const updatedPages = [...currentDocument.pages];
    updatedPages[selectedPageIndex] = {
      ...currentPage,
      edits: { ...edits, rotation: newRotation },
    };
    updateDocument(currentDocument.id, { pages: updatedPages });
  }, [currentDocument, currentPage, selectedPageIndex, edits, updateDocument]);

  // Handle brightness change
  const handleBrightnessChange = useCallback(
    (value: number) => {
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        edits: { ...edits, brightness: value },
      };
      updateDocument(currentDocument.id, { pages: updatedPages });
    },
    [currentDocument, currentPage, selectedPageIndex, edits, updateDocument]
  );

  // Handle contrast change
  const handleContrastChange = useCallback(
    (value: number) => {
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        edits: { ...edits, contrast: value },
      };
      updateDocument(currentDocument.id, { pages: updatedPages });
    },
    [currentDocument, currentPage, selectedPageIndex, edits, updateDocument]
  );

  // Handle saturation change
  const handleSaturationChange = useCallback(
    (value: number) => {
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        edits: { ...edits, saturation: value },
      };
      updateDocument(currentDocument.id, { pages: updatedPages });
    },
    [currentDocument, currentPage, selectedPageIndex, edits, updateDocument]
  );

  // Handle crop corners change
  const handleCropCornersChange = useCallback(
    (corners: [CropCorner, CropCorner, CropCorner, CropCorner]) => {
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        edits: { ...edits, cropCorners: corners },
      };
      updateDocument(currentDocument.id, { pages: updatedPages });
    },
    [currentDocument, currentPage, selectedPageIndex, edits, updateDocument]
  );

  // Apply preset
  const handlePresetChange = useCallback(
    (preset: PresetType) => {
      const updatedPages = [...currentDocument.pages];
      const newEdits = applyPreset(edits, preset);
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        edits: newEdits,
      };
      updateDocument(currentDocument.id, { pages: updatedPages });
    },
    [currentDocument, currentPage, selectedPageIndex, edits, updateDocument]
  );

  // Apply edits - generate preview
  const handleApply = useCallback(async () => {
    setIsProcessing(true);
    debugLogger.info('Applying edits to preview...', edits);

    try {
      const actions: ImageManipulator.Action[] = [];

      // Rotation
      if (edits.rotation !== 0) {
        actions.push({ rotate: edits.rotation });
      }

      // Crop
      const cropX = Math.min(...edits.cropCorners.map((c) => c.x));
      const cropY = Math.min(...edits.cropCorners.map((c) => c.y));
      const cropWidth = Math.max(...edits.cropCorners.map((c) => c.x)) - cropX;
      const cropHeight = Math.max(...edits.cropCorners.map((c) => c.y)) - cropY;

      if (cropX > 0.01 || cropY > 0.01 || cropWidth < 0.99 || cropHeight < 0.99) {
        // Get current dimensions (account for rotation)
        let width = currentPage.width;
        let height = currentPage.height;
        if (edits.rotation === 90 || edits.rotation === 270) {
          [width, height] = [height, width];
        }

        actions.push({
          crop: {
            originX: Math.round(cropX * width),
            originY: Math.round(cropY * height),
            width: Math.round(cropWidth * width),
            height: Math.round(cropHeight * height),
          },
        });
      }

      // Apply actions
      if (actions.length > 0) {
        const result = await ImageManipulator.manipulateAsync(
          currentPage.originalUri,
          actions,
          {
            compress: 0.9,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        setPreviewUri(result.uri);
        debugLogger.success('Preview generated');
      }
    } catch (error) {
      debugLogger.error('Failed to apply edits', error);
      Alert.alert('Error', 'Failed to apply edits. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [currentPage, edits]);

  // Save and move to next page or finish
  const handleDone = useCallback(async () => {
    setIsProcessing(true);
    debugLogger.info('Saving page edits...');

    try {
      const actions: ImageManipulator.Action[] = [];

      // Rotation
      if (edits.rotation !== 0) {
        actions.push({ rotate: edits.rotation });
      }

      // Crop
      const cropX = Math.min(...edits.cropCorners.map((c) => c.x));
      const cropY = Math.min(...edits.cropCorners.map((c) => c.y));
      const cropWidth = Math.max(...edits.cropCorners.map((c) => c.x)) - cropX;
      const cropHeight = Math.max(...edits.cropCorners.map((c) => c.y)) - cropY;

      let finalUri = currentPage.uri;

      if (actions.length > 0 || cropX > 0.01 || cropY > 0.01 || cropWidth < 0.99 || cropHeight < 0.99) {
        // Get current dimensions (account for rotation)
        let width = currentPage.width;
        let height = currentPage.height;
        if (edits.rotation === 90 || edits.rotation === 270) {
          [width, height] = [height, width];
        }

        if (cropX > 0.01 || cropY > 0.01 || cropWidth < 0.99 || cropHeight < 0.99) {
          actions.push({
            crop: {
              originX: Math.round(cropX * width),
              originY: Math.round(cropY * height),
              width: Math.round(cropWidth * width),
              height: Math.round(cropHeight * height),
            },
          });
        }

        const result = await ImageManipulator.manipulateAsync(
          currentPage.originalUri,
          actions,
          {
            compress: 0.9,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        finalUri = result.uri;
      }

      // Update page with processed URI
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        uri: finalUri,
        processedUri: finalUri,
      };

      updateDocument(currentDocument.id, { pages: updatedPages });

      // Move to next page or finish
      if (selectedPageIndex < currentDocument.pages.length - 1) {
        setSelectedPageIndex(selectedPageIndex + 1);
        setPreviewUri(null);
        setShowCropOverlay(false);
      } else {
        debugLogger.success('All pages edited!');
        router.push('/(tabs)/documents');
      }
    } catch (error) {
      debugLogger.error('Failed to save edits', error);
      Alert.alert('Error', 'Failed to save edits. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [currentDocument, currentPage, selectedPageIndex, edits, updateDocument, router]);

  // Skip to next page
  const handleSkip = useCallback(() => {
    if (selectedPageIndex < currentDocument.pages.length - 1) {
      setSelectedPageIndex(selectedPageIndex + 1);
      setPreviewUri(null);
      setShowCropOverlay(false);
    } else {
      router.push('/(tabs)/documents');
    }
  }, [selectedPageIndex, currentDocument, router]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Page {selectedPageIndex + 1}/{currentDocument.pages.length}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipButton}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      <View style={styles.previewContainer}>
        <View style={[styles.imageWrapper, { transform: [{ rotate: `${edits.rotation}deg` }] }]}>
          <Image
            source={{ uri: displayUri }}
            style={styles.previewImage}
            resizeMode="contain"
            onLoad={(e) => {
              debugLogger.info('Image loaded', {
                width: e.nativeEvent.source.width,
                height: e.nativeEvent.source.height,
              });
            }}
          />
        </View>

        {/* Crop Overlay */}
        {showCropOverlay && (
          <CropOverlay
            corners={edits.cropCorners as any}
            imageWidth={currentPage.width}
            imageHeight={currentPage.height}
            onCornersChange={handleCropCornersChange as any}
          />
        )}
      </View>

      {/* Thumbnail Strip */}
      {currentDocument.pages.length > 1 && (
        <View style={styles.thumbnailStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailContent}>
            {currentDocument.pages.map((page, index) => (
              <TouchableOpacity
                key={page.id}
                style={[styles.thumbnail, selectedPageIndex === index && styles.thumbnailSelected]}
                onPress={() => {
                  setSelectedPageIndex(index);
                  setPreviewUri(null);
                  setShowCropOverlay(false);
                }}
              >
                <Image source={{ uri: page.uri }} style={styles.thumbnailImage} />
                <Text style={styles.thumbnailNumber}>{index + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Presets */}
      <View style={styles.presetsContainer}>
        <Text style={styles.sectionLabel}>Filters</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.presetsRow}>
            {(['none', 'blackAndWhite', 'grayscale', 'enhance'] as PresetType[]).map((preset) => (
              <TouchableOpacity
                key={preset}
                style={[styles.presetButton, edits.preset === preset && styles.presetButtonActive]}
                onPress={() => handlePresetChange(preset)}
              >
                <Text style={[styles.presetLabel, edits.preset === preset && styles.presetLabelActive]}>
                  {preset === 'none' ? 'Original' : preset === 'blackAndWhite' ? 'B&W' : preset === 'grayscale' ? 'Gray' : 'Enhance'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Controls */}
      <ScrollView style={styles.controlsScroll} contentContainerStyle={styles.controlsContainer}>
        {/* Tonal Controls */}
        <View style={styles.controlSection}>
          <Text style={styles.sectionLabel}>Adjustments</Text>

          <View style={styles.sliderGroup}>
            <Text style={styles.sliderLabel}>Brightness: {edits.brightness.toFixed(2)}</Text>
            <Slider
              value={edits.brightness}
              min={-0.5}
              max={0.5}
              step={0.05}
              onValueChange={handleBrightnessChange}
            />
          </View>

          <View style={styles.sliderGroup}>
            <Text style={styles.sliderLabel}>Contrast: {edits.contrast.toFixed(2)}</Text>
            <Slider
              value={edits.contrast}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={handleContrastChange}
            />
          </View>

          <View style={styles.sliderGroup}>
            <Text style={styles.sliderLabel}>Saturation: {edits.saturation.toFixed(2)}</Text>
            <Slider
              value={edits.saturation}
              min={0}
              max={2}
              step={0.1}
              onValueChange={handleSaturationChange}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleRotate}>
            <Text style={styles.actionIcon}>⟲</Text>
            <Text style={styles.actionLabel}>Rotate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowCropOverlay(!showCropOverlay)}
          >
            <Text style={styles.actionIcon}>⊡</Text>
            <Text style={styles.actionLabel}>{showCropOverlay ? 'Hide Crop' : 'Crop'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.applyButton]}
            onPress={handleApply}
            disabled={isProcessing}
          >
            <Text style={styles.applyButtonText}>{isProcessing ? 'Processing...' : 'Apply'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.doneButton]}
            onPress={handleDone}
            disabled={isProcessing}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerButton: {
    ...typography.body,
    color: colors.primary.teal,
    minWidth: 60,
  },
  skipButton: {
    ...typography.body,
    color: colors.text.secondary.dark,
    minWidth: 60,
    textAlign: 'right',
  },
  headerTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
  },
  previewContainer: {
    height: PREVIEW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    padding: spacing.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailStrip: {
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    paddingVertical: spacing.sm,
  },
  thumbnailContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 50,
    height: 70,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbnailSelected: {
    borderColor: colors.primary.teal,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailNumber: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    fontSize: 9,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
  },
  presetsContainer: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  presetButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.dark,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  presetButtonActive: {
    backgroundColor: colors.primary.teal,
    borderColor: colors.primary.teal,
  },
  presetLabel: {
    ...typography.caption,
    color: colors.text.secondary.dark,
  },
  presetLabelActive: {
    color: colors.text.primary.dark,
    fontWeight: '600',
  },
  controlsScroll: {
    flex: 1,
  },
  controlsContainer: {
    padding: spacing.md,
  },
  controlSection: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  sliderGroup: {
    marginBottom: spacing.md,
  },
  sliderLabel: {
    ...typography.caption,
    color: colors.text.primary.dark,
    marginBottom: spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface.dark,
    borderRadius: borderRadius.lg,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.text.secondary.dark,
  },
  applyButton: {
    backgroundColor: colors.primary.purple,
  },
  applyButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
  doneButton: {
    backgroundColor: colors.status.success,
  },
  doneButtonText: {
    ...typography.button,
    color: 'white',
  },
  errorText: {
    ...typography.body,
    color: colors.text.primary.dark,
    textAlign: 'center',
    padding: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.primary.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
  },
  backButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
});
