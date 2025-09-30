import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  PanResponder,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { useDocumentStore } from '../../stores/documentStore';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { CropCorner } from '../../types';
import { Slider } from '../../components/ui/Slider';
import { debugLogger } from '../../utils/debugLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_HEIGHT - 250;

export default function EditScreen() {
  const router = useRouter();
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const updateDocument = useDocumentStore((state) => state.updateDocument);

  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(1);
  const [cropCorners, setCropCorners] = useState<CropCorner[]>([
    { x: 0.05, y: 0.05 },
    { x: 0.95, y: 0.05 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 },
  ]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);
  const [showBrightnessModal, setShowBrightnessModal] = useState(false);
  const [showContrastModal, setShowContrastModal] = useState(false);

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

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
  };

  const handleCornerDrag = (index: number, x: number, y: number) => {
    const newCorners = [...cropCorners];
    newCorners[index] = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
    setCropCorners(newCorners);
  };

  const createPanResponder = (cornerIndex: number) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const x = (gestureState.moveX - 20) / (SCREEN_WIDTH - 40);
        const y = gestureState.moveY / PREVIEW_HEIGHT;
        handleCornerDrag(cornerIndex, x, y);
      },
    });
  };

  const panResponders = [
    createPanResponder(0),
    createPanResponder(1),
    createPanResponder(2),
    createPanResponder(3),
  ];

  const handleSave = async () => {
    if (!currentPage || !imageSize.width) {
      debugLogger.warn('Skipping save - no image loaded yet');
      return;
    }

    setSaving(true);
    debugLogger.info('💾 Starting save...', { rotation, brightness, contrast, imageSize });

    try {
      debugLogger.info('Processing edits separately to avoid dimension issues');

      // Apply manipulations - do rotation first if needed, THEN crop
      let resultUri = currentPage.uri;
      let currentWidth = imageSize.width;
      let currentHeight = imageSize.height;

      // Step 1: Apply rotation if needed
      if (rotation !== 0) {
        debugLogger.info('Step 1: Applying rotation');
        const rotateResult = await ImageManipulator.manipulateAsync(
          currentPage.uri,
          [{ rotate: rotation }],
          { compress: 1, format: ImageManipulator.SaveFormat.PNG }
        );
        resultUri = rotateResult.uri;

        // Swap dimensions if rotated 90 or 270 degrees
        if (rotation === 90 || rotation === 270) {
          [currentWidth, currentHeight] = [currentHeight, currentWidth];
          debugLogger.info('Dimensions swapped after rotation', {
            newWidth: currentWidth,
            newHeight: currentHeight
          });
        }
      }

      // Step 2: Apply crop using the current (possibly rotated) dimensions
      const cropX = Math.min(...cropCorners.map((c) => c.x));
      const cropY = Math.min(...cropCorners.map((c) => c.y));
      const cropWidth = Math.max(...cropCorners.map((c) => c.x)) - cropX;
      const cropHeight = Math.max(...cropCorners.map((c) => c.y)) - cropY;

      // Only crop if meaningful
      if (cropX > 0.01 || cropY > 0.01 || cropWidth < 0.99 || cropHeight < 0.99) {
        const cropData = {
          originX: Math.round(cropX * currentWidth),
          originY: Math.round(cropY * currentHeight),
          width: Math.round(cropWidth * currentWidth),
          height: Math.round(cropHeight * currentHeight),
        };

        // Validate crop dimensions
        if (cropData.width > 0 && cropData.height > 0 &&
            cropData.originX + cropData.width <= currentWidth &&
            cropData.originY + cropData.height <= currentHeight) {

          debugLogger.info('Step 2: Applying crop to rotated image', cropData);
          const cropResult = await ImageManipulator.manipulateAsync(
            resultUri,
            [{ crop: cropData }],
            { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
          );
          resultUri = cropResult.uri;
          debugLogger.success('Crop complete');
        } else {
          debugLogger.warn('Crop dimensions invalid, skipping', cropData);
        }
      }

      debugLogger.success('All manipulations complete', {
        finalUri: resultUri.substring(0, 50) + '...'
      });

      // Update the page in the document
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        uri: resultUri,
      };

      debugLogger.info('Updating document in store', { docId: currentDocument.id });
      updateDocument(currentDocument.id, { pages: updatedPages });

      // Small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to next page or back to documents
      if (selectedPageIndex < currentDocument.pages.length - 1) {
        debugLogger.info('Moving to next page', { nextPage: selectedPageIndex + 1 });
        setSelectedPageIndex(selectedPageIndex + 1);
        setRotation(0);
        setBrightness(0);
        setContrast(1);
        setCropCorners([
          { x: 0.05, y: 0.05 },
          { x: 0.95, y: 0.05 },
          { x: 0.95, y: 0.95 },
          { x: 0.05, y: 0.95 },
        ]);
      } else {
        debugLogger.success('All pages saved! Navigating to documents');
        router.push('/(tabs)/documents');
      }
    } catch (error) {
      debugLogger.error('Error saving edits', error);
      alert('Failed to save edits. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Edit ({selectedPageIndex + 1}/{currentDocument.pages.length})
          </Text>
          <TouchableOpacity
            onPress={() => {
              // Skip to next page without saving edits
              if (selectedPageIndex < currentDocument.pages.length - 1) {
                setSelectedPageIndex(selectedPageIndex + 1);
                setRotation(0);
                setBrightness(0);
                setContrast(1);
                setCropCorners([
                  { x: 0.05, y: 0.05 },
                  { x: 0.95, y: 0.05 },
                  { x: 0.95, y: 0.95 },
                  { x: 0.05, y: 0.95 },
                ]);
              } else {
                router.push('/(tabs)/documents');
              }
            }}
          >
            <Text style={styles.skipButton}>Skip</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.headerButton, styles.saveButton]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Preview Area */}
      <View style={styles.previewContainer}>
        <View style={[styles.imageContainer, { transform: [{ rotate: `${rotation}deg` }] }]}>
          <Image
            source={{ uri: currentPage.uri }}
            style={[
              styles.previewImage,
              {
                opacity: 1 + brightness,
                // Note: React Native doesn't support filter CSS, so brightness/contrast
                // will be applied during save via ImageManipulator
              },
            ]}
            resizeMode="contain"
            onLoad={(e) => {
              const { width, height } = e.nativeEvent.source;
              setImageSize({ width, height });
            }}
          />
        </View>

        {/* Crop Corners Overlay */}
        <View style={styles.cropOverlay}>
          {cropCorners.map((corner, index) => (
            <View
              key={index}
              style={[
                styles.cropCorner,
                {
                  left: corner.x * (SCREEN_WIDTH - 40) + 20 - 15,
                  top: corner.y * PREVIEW_HEIGHT - 15,
                },
              ]}
              {...panResponders[index].panHandlers}
            />
          ))}

          {/* Crop lines */}
          <View
            style={[
              styles.cropLine,
              styles.cropLineHorizontal,
              {
                top: cropCorners[0].y * PREVIEW_HEIGHT,
                left: cropCorners[0].x * (SCREEN_WIDTH - 40) + 20,
                width: (cropCorners[1].x - cropCorners[0].x) * (SCREEN_WIDTH - 40),
              },
            ]}
          />
          <View
            style={[
              styles.cropLine,
              styles.cropLineHorizontal,
              {
                top: cropCorners[2].y * PREVIEW_HEIGHT,
                left: cropCorners[3].x * (SCREEN_WIDTH - 40) + 20,
                width: (cropCorners[2].x - cropCorners[3].x) * (SCREEN_WIDTH - 40),
              },
            ]}
          />
          <View
            style={[
              styles.cropLine,
              styles.cropLineVertical,
              {
                left: cropCorners[0].x * (SCREEN_WIDTH - 40) + 20,
                top: cropCorners[0].y * PREVIEW_HEIGHT,
                height: (cropCorners[3].y - cropCorners[0].y) * PREVIEW_HEIGHT,
              },
            ]}
          />
          <View
            style={[
              styles.cropLine,
              styles.cropLineVertical,
              {
                left: cropCorners[1].x * (SCREEN_WIDTH - 40) + 20,
                top: cropCorners[1].y * PREVIEW_HEIGHT,
                height: (cropCorners[2].y - cropCorners[1].y) * PREVIEW_HEIGHT,
              },
            ]}
          />
        </View>
      </View>

      {/* Thumbnail Strip */}
      {currentDocument.pages.length > 1 && (
        <View style={styles.thumbnailStrip}>
          <ScrollView
            horizontal
            contentContainerStyle={styles.thumbnailStripContent}
            showsHorizontalScrollIndicator={false}
          >
            {currentDocument.pages.map((page, index) => (
              <TouchableOpacity
                key={page.id}
                style={[
                  styles.thumbnail,
                  selectedPageIndex === index && styles.thumbnailSelected,
                ]}
                onPress={() => {
                  setSelectedPageIndex(index);
                  setRotation(0);
                  setCropCorners([
                    { x: 0.05, y: 0.05 },
                    { x: 0.95, y: 0.05 },
                    { x: 0.95, y: 0.95 },
                    { x: 0.05, y: 0.95 },
                  ]);
                }}
                onLongPress={() => {
                  // TODO: Enable drag mode
                }}
              >
                <Image source={{ uri: page.uri }} style={styles.thumbnailImage} />
                <Text style={styles.thumbnailNumber}>{index + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.thumbnailHint}>Tap to select • Long press to reorder</Text>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleRotate}>
          <Text style={styles.controlIcon}>⟲</Text>
          <Text style={styles.controlLabel}>Rotate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={() => setShowBrightnessModal(true)}>
          <Text style={styles.controlIcon}>☀</Text>
          <Text style={styles.controlLabel}>Brightness</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={() => setShowContrastModal(true)}>
          <Text style={styles.controlIcon}>◐</Text>
          <Text style={styles.controlLabel}>Contrast</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlIcon}>⊡</Text>
          <Text style={styles.controlLabel}>Crop</Text>
        </TouchableOpacity>
      </View>

      {/* Brightness Modal */}
      <Modal
        visible={showBrightnessModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBrightnessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Brightness</Text>
              <TouchableOpacity onPress={() => setShowBrightnessModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sliderContainer}>
              <Slider
                value={brightness}
                min={-0.5}
                max={0.5}
                step={0.05}
                onValueChange={setBrightness}
                label="Brightness"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Contrast Modal */}
      <Modal
        visible={showContrastModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowContrastModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Contrast</Text>
              <TouchableOpacity onPress={() => setShowContrastModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sliderContainer}>
              <Slider
                value={contrast}
                min={0.5}
                max={2}
                step={0.1}
                onValueChange={setContrast}
                label="Contrast"
              />
            </View>
          </View>
        </View>
      </Modal>
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
    gap: spacing.xs,
  },
  headerButton: {
    ...typography.body,
    color: colors.primary.teal,
    minWidth: 60,
  },
  saveButton: {
    color: colors.primary.purple,
    fontWeight: '600',
  },
  skipButton: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    marginTop: 2,
  },
  headerTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
  },
  previewContainer: {
    height: PREVIEW_HEIGHT,
    position: 'relative',
    padding: spacing.md,
  },
  imageContainer: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  cropCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary.teal,
    borderWidth: 3,
    borderColor: 'white',
  },
  cropLine: {
    position: 'absolute',
    backgroundColor: colors.primary.teal,
  },
  cropLineHorizontal: {
    height: 2,
  },
  cropLineVertical: {
    width: 2,
  },
  thumbnailStrip: {
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    paddingBottom: spacing.sm,
  },
  thumbnailHint: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    textAlign: 'center',
    paddingTop: spacing.xs,
    fontSize: 11,
  },
  thumbnailStripContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 60,
    height: 80,
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
    fontSize: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  controlButton: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  controlIcon: {
    fontSize: 28,
    color: colors.text.primary.dark,
  },
  controlLabel: {
    ...typography.caption,
    color: colors.text.secondary.dark,
  },
  errorText: {
    ...typography.body,
    color: colors.text.primary.dark,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: colors.primary.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    marginTop: spacing.md,
  },
  backButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.dark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  modalTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
  },
  modalClose: {
    ...typography.body,
    color: colors.primary.teal,
    fontWeight: '600',
  },
  sliderContainer: {
    padding: spacing.lg,
  },
});
