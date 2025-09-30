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
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { useDocumentStore } from '../../stores/documentStore';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { CropCorner } from '../../types';

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
    setSaving(true);

    try {
      const actions: ImageManipulator.Action[] = [];

      // Apply rotation
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // Apply crop
      const cropX = Math.min(...cropCorners.map((c) => c.x));
      const cropY = Math.min(...cropCorners.map((c) => c.y));
      const cropWidth = Math.max(...cropCorners.map((c) => c.x)) - cropX;
      const cropHeight = Math.max(...cropCorners.map((c) => c.y)) - cropY;

      if (cropWidth > 0 && cropHeight > 0 && imageSize.width > 0) {
        actions.push({
          crop: {
            originX: cropX * imageSize.width,
            originY: cropY * imageSize.height,
            width: cropWidth * imageSize.width,
            height: cropHeight * imageSize.height,
          },
        });
      }

      const result = await ImageManipulator.manipulateAsync(
        currentPage.uri,
        actions,
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Update the page in the document
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        uri: result.uri,
      };

      updateDocument(currentDocument.id, { pages: updatedPages });

      // Navigate to next page or back to documents
      if (selectedPageIndex < currentDocument.pages.length - 1) {
        setSelectedPageIndex(selectedPageIndex + 1);
        setRotation(0);
        setCropCorners([
          { x: 0.05, y: 0.05 },
          { x: 0.95, y: 0.05 },
          { x: 0.95, y: 0.95 },
          { x: 0.05, y: 0.95 },
        ]);
      } else {
        router.push('/(tabs)/documents');
      }
    } catch (error) {
      console.error('Error saving edits:', error);
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
        <Text style={styles.headerTitle}>
          Edit ({selectedPageIndex + 1}/{currentDocument.pages.length})
        </Text>
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
            style={styles.previewImage}
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
        <ScrollView
          horizontal
          style={styles.thumbnailStrip}
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
            >
              <Image source={{ uri: page.uri }} style={styles.thumbnailImage} />
              <Text style={styles.thumbnailNumber}>{index + 1}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleRotate}>
          <Text style={styles.controlIcon}>⟲</Text>
          <Text style={styles.controlLabel}>Rotate</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlIcon}>☀</Text>
          <Text style={styles.controlLabel}>Brightness</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlIcon}>◐</Text>
          <Text style={styles.controlLabel}>Contrast</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.controlIcon}>⊡</Text>
          <Text style={styles.controlLabel}>Crop</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  headerButton: {
    ...typography.body,
    color: colors.primary.teal,
  },
  saveButton: {
    color: colors.primary.purple,
    fontWeight: '600',
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
    maxHeight: 100,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
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
});
