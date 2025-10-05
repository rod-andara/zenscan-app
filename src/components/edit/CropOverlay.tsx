import { View, StyleSheet } from 'react-native';

// EMERGENCY: Gestures and Reanimated disabled for stability
// This component will be rebuilt with stable gestures later

interface CropOverlayProps {
  corners: Array<{ x: number; y: number }>;
  imageWidth: number;
  imageHeight: number;
  onCornersChange: (corners: Array<{ x: number; y: number }>) => void;
}

export function CropOverlay({
  corners,
  imageWidth,
  imageHeight,
  onCornersChange,
}: CropOverlayProps) {
  // Temporarily disabled - just show empty overlay
  return <View style={styles.container} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
