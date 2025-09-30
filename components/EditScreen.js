import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  PanResponder,
  Alert,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_HEIGHT - 250;

export default function EditScreen({ document, onNavigateBack, onNavigateToDocuments, onUpdateDocument }) {
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [cropCorners, setCropCorners] = useState([
    { x: 0.05, y: 0.05 },
    { x: 0.95, y: 0.05 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 },
  ]);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);

  if (!document || document.pages.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No document to edit</Text>
        <TouchableOpacity style={styles.backButton} onPress={onNavigateBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentPage = document.pages[selectedPageIndex];

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
  };

  const handleCornerDrag = (index, x, y) => {
    const newCorners = [...cropCorners];
    newCorners[index] = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
    setCropCorners(newCorners);
  };

  const createPanResponder = (cornerIndex) => {
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
      return;
    }

    setSaving(true);

    try {
      let resultUri = currentPage.uri;
      let currentWidth = imageSize.width;
      let currentHeight = imageSize.height;

      // Step 1: Apply rotation if needed
      if (rotation !== 0) {
        const rotateResult = await ImageManipulator.manipulateAsync(
          currentPage.uri,
          [{ rotate: rotation }],
          { compress: 1, format: ImageManipulator.SaveFormat.PNG }
        );
        resultUri = rotateResult.uri;

        // Swap dimensions if rotated 90 or 270 degrees
        if (rotation === 90 || rotation === 270) {
          [currentWidth, currentHeight] = [currentHeight, currentWidth];
        }
      }

      // Step 2: Apply crop
      const cropX = Math.min(...cropCorners.map((c) => c.x));
      const cropY = Math.min(...cropCorners.map((c) => c.y));
      const cropWidth = Math.max(...cropCorners.map((c) => c.x)) - cropX;
      const cropHeight = Math.max(...cropCorners.map((c) => c.y)) - cropY;

      if (cropX > 0.01 || cropY > 0.01 || cropWidth < 0.99 || cropHeight < 0.99) {
        const cropData = {
          originX: Math.round(cropX * currentWidth),
          originY: Math.round(cropY * currentHeight),
          width: Math.round(cropWidth * currentWidth),
          height: Math.round(cropHeight * currentHeight),
        };

        if (cropData.width > 0 && cropData.height > 0 &&
            cropData.originX + cropData.width <= currentWidth &&
            cropData.originY + cropData.height <= currentHeight) {

          const cropResult = await ImageManipulator.manipulateAsync(
            resultUri,
            [{ crop: cropData }],
            { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
          );
          resultUri = cropResult.uri;
        }
      }

      // Update the page in the document
      const updatedPages = [...document.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        uri: resultUri,
      };

      onUpdateDocument(document.id, { pages: updatedPages });

      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to next page or back to documents
      if (selectedPageIndex < document.pages.length - 1) {
        setSelectedPageIndex(selectedPageIndex + 1);
        setRotation(0);
        setCropCorners([
          { x: 0.05, y: 0.05 },
          { x: 0.95, y: 0.05 },
          { x: 0.95, y: 0.95 },
          { x: 0.05, y: 0.95 },
        ]);
      } else {
        onNavigateToDocuments();
      }
    } catch (error) {
      console.error('Error saving edits:', error);
      Alert.alert('Error', 'Failed to save edits. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (selectedPageIndex < document.pages.length - 1) {
      setSelectedPageIndex(selectedPageIndex + 1);
      setRotation(0);
      setCropCorners([
        { x: 0.05, y: 0.05 },
        { x: 0.95, y: 0.05 },
        { x: 0.95, y: 0.95 },
        { x: 0.05, y: 0.95 },
      ]);
    } else {
      onNavigateToDocuments();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Edit ({selectedPageIndex + 1}/{document.pages.length})
          </Text>
          <TouchableOpacity onPress={handleSkip}>
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
      {document.pages.length > 1 && (
        <ScrollView
          horizontal
          style={styles.thumbnailStrip}
          contentContainerStyle={styles.thumbnailStripContent}
          showsHorizontalScrollIndicator={false}
        >
          {document.pages.map((page, index) => (
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  headerButton: {
    fontSize: 16,
    color: '#14B8A6',
    minWidth: 60,
  },
  saveButton: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  skipButton: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  previewContainer: {
    height: PREVIEW_HEIGHT,
    position: 'relative',
    padding: 16,
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
    backgroundColor: '#14B8A6',
    borderWidth: 3,
    borderColor: 'white',
  },
  cropLine: {
    position: 'absolute',
    backgroundColor: '#14B8A6',
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
    borderTopColor: '#333',
  },
  thumbnailStripContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbnailSelected: {
    borderColor: '#14B8A6',
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
  },
  controlIcon: {
    fontSize: 28,
    color: '#fff',
  },
  controlLabel: {
    fontSize: 14,
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
