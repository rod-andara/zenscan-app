/**
 * Auto-Capture Indicator Component
 * Shows countdown and progress for auto-capture
 *
 * SAFE: Uses Reanimated for UI animations only (NO worklets)
 */

import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { AutoCaptureState } from '../../utils/autoCaptureController';
import { colors, spacing } from '../../design/tokens';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';

interface AutoCaptureIndicatorProps {
  state: AutoCaptureState;
  enabled: boolean;
}

export function AutoCaptureIndicator({ state, enabled }: AutoCaptureIndicatorProps) {
  // Haptic feedback on state changes
  useEffect(() => {
    if (!enabled) return;

    if (state.isReady && state.progress === 0) {
      // Quality threshold met - light feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (state.isReady && state.progress >= 0.5 && state.progress < 0.6) {
      // Halfway - medium feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (state.shouldCapture) {
      // Capturing - heavy feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  }, [state.isReady, state.progress, state.shouldCapture, enabled]);

  // Animated ring style
  const ringStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      state.progress,
      [0, 1],
      [0.8, 1.1]
    );

    return {
      transform: [
        {
          scale: withSpring(state.isReady ? scale : 0.8, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
      opacity: withTiming(state.isReady ? 1 : 0, { duration: 200 }),
    };
  });

  // Animated progress ring
  const progressStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      state.progress,
      [0, 1],
      [0, 360]
    );

    return {
      transform: [
        {
          rotate: withTiming(`${rotation}deg`, { duration: 100 }),
        },
      ],
    };
  });

  // Animated countdown text
  const textStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(state.isReady ? 1 : 0, { duration: 200 }),
      transform: [
        {
          scale: withSpring(state.isReady ? 1 : 0.5, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  if (!enabled || !state.isReady) {
    return null;
  }

  const seconds = Math.ceil(state.timeRemaining / 1000);

  return (
    <View style={styles.container}>
      {/* Outer ring */}
      <Animated.View style={[styles.ring, ringStyle]}>
        <View style={styles.ringInner} />
      </Animated.View>

      {/* Progress ring */}
      <Animated.View style={[styles.progressRing, progressStyle]}>
        <View style={styles.progressSegment} />
      </Animated.View>

      {/* Countdown text */}
      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.countdownText}>{seconds}</Text>
        <Text style={styles.labelText}>Hold steady...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: colors.primary.teal,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  ringInner: {
    flex: 1,
    margin: 8,
    borderRadius: 52,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressRing: {
    position: 'absolute',
    width: 120,
    height: 120,
  },
  progressSegment: {
    position: 'absolute',
    top: 0,
    left: '50%',
    width: 4,
    height: 8,
    marginLeft: -2,
    backgroundColor: colors.primary.teal,
    borderRadius: 2,
  },
  textContainer: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  labelText: {
    fontSize: 12,
    color: colors.primary.teal,
    marginTop: spacing.xs,
  },
});
