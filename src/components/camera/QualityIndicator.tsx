/**
 * Quality Indicator Component
 * Displays scan quality with animated feedback
 *
 * SAFE: Uses Reanimated for UI animations only (NO worklets)
 */

import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { QualityScore } from '../../utils/scanQualityAnalyzer';
import { colors, spacing } from '../../design/tokens';

interface QualityIndicatorProps {
  quality: QualityScore;
  visible: boolean;
}

export function QualityIndicator({ quality, visible }: QualityIndicatorProps) {
  // Animated styles for quality bar
  const barStyle = useAnimatedStyle(() => {
    return {
      width: withSpring(`${quality.overall}%`, {
        damping: 15,
        stiffness: 150,
      }),
      backgroundColor: withTiming(quality.color, { duration: 300 }),
    };
  });

  // Animated styles for container
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
      transform: [
        {
          translateY: withSpring(visible ? 0 : -20, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {/* Quality Score */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreText}>{quality.overall}</Text>
        <Text style={styles.scoreLabelText}>Quality</Text>
      </View>

      {/* Quality Bar */}
      <View style={styles.barBackground}>
        <Animated.View style={[styles.bar, barStyle]} />
      </View>

      {/* Recommendation */}
      <Text style={styles.recommendationText}>{quality.recommendation}</Text>

      {/* Detail Scores */}
      <View style={styles.detailsContainer}>
        <DetailScore label="Fill" score={quality.fillScore} />
        <DetailScore label="Stability" score={quality.stabilityScore} />
        <DetailScore label="Sharpness" score={quality.sharpnessScore} />
        <DetailScore label="Confidence" score={quality.confidenceScore} />
      </View>
    </Animated.View>
  );
}

function DetailScore({ label, score }: { label: string; score: number }) {
  const barStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      score,
      [0, 40, 70, 100],
      ['#EF4444', '#EAB308', '#22C55E', '#22C55E']
    );

    return {
      width: withSpring(`${score}%`, {
        damping: 15,
        stiffness: 150,
      }),
      backgroundColor: color,
    };
  });

  return (
    <View style={styles.detailScore}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailBarBackground}>
        <Animated.View style={[styles.detailBar, barStyle]} />
      </View>
      <Text style={styles.detailValue}>{Math.round(score)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    padding: spacing.lg,
    margin: spacing.lg,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  scoreText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scoreLabelText: {
    fontSize: 14,
    color: '#999999',
    marginTop: spacing.xs,
  },
  barBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  recommendationText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  detailsContainer: {
    gap: spacing.sm,
  },
  detailScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999999',
    width: 70,
  },
  detailBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  detailBar: {
    height: '100%',
    borderRadius: 2,
  },
  detailValue: {
    fontSize: 12,
    color: '#FFFFFF',
    width: 30,
    textAlign: 'right',
  },
});
