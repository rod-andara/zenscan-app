/**
 * CropOverlay Component
 * Draggable corner handles for cropping images
 * Uses react-native-gesture-handler and Reanimated for smooth interactions
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Polygon, Circle } from 'react-native-svg';
import { CropCorner } from '../../types';
import { colors } from '../../design/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CropOverlayProps {
  corners: [CropCorner, CropCorner, CropCorner, CropCorner];
  imageWidth: number;
  imageHeight: number;
  onCornersChange: (corners: [CropCorner, CropCorner, CropCorner, CropCorner]) => void;
  containerWidth?: number;
  containerHeight?: number;
}

const CORNER_SIZE = 30;
const CORNER_RADIUS = 15;

export function CropOverlay({
  corners,
  imageWidth,
  imageHeight,
  onCornersChange,
  containerWidth = Dimensions.get('window').width,
  containerHeight = Dimensions.get('window').height * 0.6,
}: CropOverlayProps) {
  // Calculate scale factors
  const scaleX = containerWidth / (imageWidth || 1);
  const scaleY = containerHeight / (imageHeight || 1);
  const scale = Math.min(scaleX, scaleY);

  // Actual display dimensions
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;

  // Offset to center the image
  const offsetX = (containerWidth - displayWidth) / 2;
  const offsetY = (containerHeight - displayHeight) / 2;

  // Convert normalized corners to screen coordinates
  const toScreenCoords = useCallback(
    (corner: CropCorner) => ({
      x: corner.x * displayWidth + offsetX,
      y: corner.y * displayHeight + offsetY,
    }),
    [displayWidth, displayHeight, offsetX, offsetY]
  );

  // Convert screen coordinates to normalized corners
  const toNormalizedCoords = useCallback(
    (x: number, y: number) => {
      const normalizedX = Math.max(0, Math.min(1, (x - offsetX) / displayWidth));
      const normalizedY = Math.max(0, Math.min(1, (y - offsetY) / displayHeight));
      return { x: normalizedX, y: normalizedY };
    },
    [displayWidth, displayHeight, offsetX, offsetY]
  );

  // Create draggable corner handle
  const createCornerHandle = (index: number) => {
    const screenPos = toScreenCoords(corners[index]);
    const translateX = useSharedValue(screenPos.x);
    const translateY = useSharedValue(screenPos.y);

    const gesture = Gesture.Pan()
      .onUpdate((event) => {
        translateX.value = event.absoluteX;
        translateY.value = event.absoluteY;
      })
      .onEnd(() => {
        // Update corners when gesture ends
        const newCorners = [...corners] as [CropCorner, CropCorner, CropCorner, CropCorner];
        newCorners[index] = toNormalizedCoords(translateX.value, translateY.value);
        runOnJS(onCornersChange)(newCorners);
      });

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value - CORNER_RADIUS },
        { translateY: translateY.value - CORNER_RADIUS },
      ],
    }));

    return (
      <GestureDetector key={index} gesture={gesture}>
        <Animated.View style={[styles.cornerHandle, animatedStyle]}>
          <View style={styles.cornerInner} />
        </Animated.View>
      </GestureDetector>
    );
  };

  // Calculate polygon points for SVG
  const polygonPoints = corners
    .map((corner) => {
      const pos = toScreenCoords(corner);
      return `${pos.x},${pos.y}`;
    })
    .join(' ');

  return (
    <View style={[styles.container, { width: containerWidth, height: containerHeight }]} pointerEvents="box-none">
      {/* SVG Overlay for crop lines */}
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Polygon
          points={polygonPoints}
          fill="rgba(20, 184, 166, 0.1)"
          stroke={colors.primary.teal}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </Svg>

      {/* Draggable corner handles */}
      {[0, 1, 2, 3].map((index) => createCornerHandle(index))}

      {/* Dimmed overlay outside crop area */}
      <View style={styles.dimOverlay} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          {/* Create a mask effect by drawing the crop polygon */}
          <Polygon
            points={polygonPoints}
            fill="transparent"
            stroke="rgba(0, 0, 0, 0.5)"
            strokeWidth={containerWidth * 2} // Very thick stroke creates the dimming effect
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cornerHandle: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderRadius: CORNER_RADIUS,
    backgroundColor: colors.primary.teal,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cornerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
});
