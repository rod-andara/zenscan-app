/**
 * Animated Document Detection Overlay
 * Shows real-time polygon outline following detected document edges
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { Point } from '../utils/documentDetection';
import { colors } from '../design/tokens';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

interface DocumentDetectionOverlayProps {
  corners: [Point, Point, Point, Point] | null;
  isStable: boolean;
  frameWidth: number;
  frameHeight: number;
  viewWidth: number;
  viewHeight: number;
}

export function DocumentDetectionOverlay({
  corners,
  isStable,
  frameWidth,
  frameHeight,
  viewWidth,
  viewHeight,
}: DocumentDetectionOverlayProps) {
  // Shared values for animated corner positions
  const corner0X = useSharedValue(0);
  const corner0Y = useSharedValue(0);
  const corner1X = useSharedValue(0);
  const corner1Y = useSharedValue(0);
  const corner2X = useSharedValue(0);
  const corner2Y = useSharedValue(0);
  const corner3X = useSharedValue(0);
  const corner3Y = useSharedValue(0);

  // Shared value for color (changes based on stability)
  const strokeOpacity = useSharedValue(0.8);

  // Scale factors to convert frame coordinates to view coordinates
  const scaleX = viewWidth / frameWidth;
  const scaleY = viewHeight / frameHeight;

  useEffect(() => {
    if (corners) {
      // Animate corner positions with spring
      corner0X.value = withSpring(corners[0].x * scaleX);
      corner0Y.value = withSpring(corners[0].y * scaleY);
      corner1X.value = withSpring(corners[1].x * scaleX);
      corner1Y.value = withSpring(corners[1].y * scaleY);
      corner2X.value = withSpring(corners[2].x * scaleX);
      corner2Y.value = withSpring(corners[2].y * scaleY);
      corner3X.value = withSpring(corners[3].x * scaleX);
      corner3Y.value = withSpring(corners[3].y * scaleY);

      // Change opacity based on stability
      strokeOpacity.value = withTiming(isStable ? 1 : 0.6, { duration: 200 });
    }
  }, [corners, isStable, scaleX, scaleY]);

  const animatedProps = useAnimatedProps(() => {
    const points = `${corner0X.value},${corner0Y.value} ${corner1X.value},${corner1Y.value} ${corner2X.value},${corner2Y.value} ${corner3X.value},${corner3Y.value}`;
    return {
      points,
      strokeOpacity: strokeOpacity.value,
    };
  });

  if (!corners) {
    return null;
  }

  const strokeColor = isStable ? colors.status.success : colors.primary.teal;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={viewWidth} height={viewHeight}>
        <AnimatedPolygon
          animatedProps={animatedProps as any}
          fill="rgba(20, 184, 166, 0.1)"
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Corner markers */}
        {corners.map((corner, index) => (
          <Animated.View
            key={index}
            style={[
              styles.cornerMarker,
              {
                left: corner.x * scaleX - 8,
                top: corner.y * scaleY - 8,
                backgroundColor: strokeColor,
              },
            ]}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
});
