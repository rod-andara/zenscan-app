/**
 * Tap-Based Crop Overlay
 *
 * SAFE: Uses ONLY Pressable (NO gesture handlers)
 * User taps corner to select it, then taps image to reposition
 *
 * CRITICAL: NO GestureDetector, NO PanGestureHandler, NO worklets
 * These caused SIGABRT crashes in Builds 22-23
 */

import { useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { colors } from '../../design/tokens';

const CORNER_SIZE = 30; // Touch target size (44px recommended, using 30 for visibility)
const CORNER_INNER_SIZE = 20; // Visual circle size

type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

export interface CornerPoint {
  x: number;
  y: number;
}

export interface CropCorners {
  topLeft: CornerPoint;
  topRight: CornerPoint;
  bottomRight: CornerPoint;
  bottomLeft: CornerPoint;
}

interface TapCropOverlayProps {
  imageWidth: number;
  imageHeight: number;
  corners: CropCorners;
  onCornersChange: (corners: CropCorners) => void;
  containerWidth?: number;
  containerHeight?: number;
}

export function TapCropOverlay({
  imageWidth,
  imageHeight,
  corners,
  onCornersChange,
  containerWidth,
  containerHeight,
}: TapCropOverlayProps) {
  const [selectedCorner, setSelectedCorner] = useState<CornerKey | null>(null);

  // Calculate scaling factor to fit image in container
  const screenWidth = containerWidth || Dimensions.get('window').width;
  const screenHeight = containerHeight || Dimensions.get('window').height - 200;

  const scaleX = screenWidth / imageWidth;
  const scaleY = screenHeight / imageHeight;
  const scale = Math.min(scaleX, scaleY);

  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;

  // Convert image coordinates to display coordinates
  const toDisplayCoords = (point: CornerPoint): CornerPoint => ({
    x: point.x * scale,
    y: point.y * scale,
  });

  // Convert display coordinates to image coordinates
  const toImageCoords = (point: CornerPoint): CornerPoint => ({
    x: point.x / scale,
    y: point.y / scale,
  });

  const displayCorners = {
    topLeft: toDisplayCoords(corners.topLeft),
    topRight: toDisplayCoords(corners.topRight),
    bottomRight: toDisplayCoords(corners.bottomRight),
    bottomLeft: toDisplayCoords(corners.bottomLeft),
  };

  // Handle tap on image to reposition selected corner
  const handleImageTap = (event: any) => {
    if (!selectedCorner) return;

    const { locationX, locationY } = event.nativeEvent;

    // Clamp to image bounds
    const clampedX = Math.max(0, Math.min(displayWidth, locationX));
    const clampedY = Math.max(0, Math.min(displayHeight, locationY));

    // Convert to image coordinates and update
    const imagePoint = toImageCoords({ x: clampedX, y: clampedY });

    const newCorners = {
      ...corners,
      [selectedCorner]: imagePoint,
    };

    onCornersChange(newCorners);
  };

  // Handle corner selection
  const handleCornerTap = (corner: CornerKey) => {
    setSelectedCorner(selectedCorner === corner ? null : corner);
  };

  return (
    <View style={[styles.container, { width: displayWidth, height: displayHeight }]}>
      {/* Tap area for repositioning corners */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleImageTap}
      >
        {/* Crop area overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(20, 184, 166, 0.1)',
              borderWidth: 2,
              borderColor: colors.primary.teal,
            },
          ]}
        />

        {/* Corner connecting lines - using View-based approach */}
        <CornerLine
          from={displayCorners.topLeft}
          to={displayCorners.topRight}
        />
        <CornerLine
          from={displayCorners.topRight}
          to={displayCorners.bottomRight}
        />
        <CornerLine
          from={displayCorners.bottomRight}
          to={displayCorners.bottomLeft}
        />
        <CornerLine
          from={displayCorners.bottomLeft}
          to={displayCorners.topLeft}
        />
      </Pressable>

      {/* Corner handles */}
      <CornerHandle
        position={displayCorners.topLeft}
        isSelected={selectedCorner === 'topLeft'}
        onTap={() => handleCornerTap('topLeft')}
        label="TL"
      />
      <CornerHandle
        position={displayCorners.topRight}
        isSelected={selectedCorner === 'topRight'}
        onTap={() => handleCornerTap('topRight')}
        label="TR"
      />
      <CornerHandle
        position={displayCorners.bottomRight}
        isSelected={selectedCorner === 'bottomRight'}
        onTap={() => handleCornerTap('bottomRight')}
        label="BR"
      />
      <CornerHandle
        position={displayCorners.bottomLeft}
        isSelected={selectedCorner === 'bottomLeft'}
        onTap={() => handleCornerTap('bottomLeft')}
        label="BL"
      />

      {/* Instruction text */}
      {selectedCorner && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Tap anywhere to move {selectedCorner.replace(/([A-Z])/g, ' $1').toLowerCase()} corner
          </Text>
        </View>
      )}
      {!selectedCorner && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Tap a corner to select it
          </Text>
        </View>
      )}
    </View>
  );
}

interface CornerLineProps {
  from: CornerPoint;
  to: CornerPoint;
}

function CornerLine({ from, to }: CornerLineProps) {
  // Calculate line angle and length
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <View
      style={[
        styles.line,
        {
          left: from.x,
          top: from.y,
          width: length,
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  );
}

interface CornerHandleProps {
  position: CornerPoint;
  isSelected: boolean;
  onTap: () => void;
  label: string;
}

function CornerHandle({ position, isSelected, onTap, label }: CornerHandleProps) {
  // Animated values for selection feedback
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1.5 : 1, {
      damping: 15,
      stiffness: 150,
    });
    opacity.value = withSpring(isSelected ? 1 : 0.8, {
      damping: 15,
      stiffness: 150,
    });
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={onTap}
      style={[
        styles.cornerHandle,
        {
          left: position.x - CORNER_SIZE / 2,
          top: position.y - CORNER_SIZE / 2,
        },
      ]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        style={[
          styles.cornerInner,
          isSelected && styles.cornerSelected,
          animatedStyle,
        ]}
      >
        <Text style={styles.cornerLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  line: {
    position: 'absolute',
    height: 2,
    backgroundColor: colors.primary.teal,
    transformOrigin: 'left center',
  },
  cornerHandle: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  cornerInner: {
    width: CORNER_INNER_SIZE,
    height: CORNER_INNER_SIZE,
    borderRadius: CORNER_INNER_SIZE / 2,
    backgroundColor: colors.primary.teal,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cornerSelected: {
    backgroundColor: colors.primary.purple,
    borderColor: colors.primary.teal,
    borderWidth: 3,
  },
  cornerLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: colors.text.primary.dark,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
});
