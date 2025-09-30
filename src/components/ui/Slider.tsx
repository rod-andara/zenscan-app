import { View, StyleSheet, PanResponder, Text } from 'react-native';
import { useState, useRef } from 'react';
import { colors, spacing, typography } from '../../design/tokens';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number) => void;
  label?: string;
}

export function Slider({ value, min, max, step = 1, onValueChange, label }: SliderProps) {
  const [width, setWidth] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        updateValue(e.nativeEvent.locationX);
      },
      onPanResponderMove: (e) => {
        updateValue(e.nativeEvent.locationX);
      },
    })
  ).current;

  const updateValue = (x: number) => {
    const percentage = Math.max(0, Math.min(1, x / width));
    const rawValue = min + percentage * (max - min);
    const steppedValue = Math.round(rawValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    onValueChange(clampedValue);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value.toFixed(1)}</Text>
        </View>
      )}
      <View
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { width: `${percentage}%` }]} />
        <View style={[styles.thumb, { left: `${percentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.text.primary.dark,
  },
  value: {
    ...typography.caption,
    color: colors.primary.teal,
    fontWeight: '600',
  },
  track: {
    height: 4,
    backgroundColor: colors.surface.dark,
    borderRadius: 2,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: colors.primary.teal,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary.teal,
    top: -8,
    marginLeft: -10,
    borderWidth: 3,
    borderColor: 'white',
  },
});
