/**
 * Document Type Indicator Component
 * Shows detected document type with animation
 *
 * SAFE: Uses Reanimated for UI animations only (NO worklets)
 */

import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { DocumentTypeResult } from '../../utils/documentTypeDetector';
import { colors, spacing } from '../../design/tokens';

interface DocumentTypeIndicatorProps {
  documentType: DocumentTypeResult | null;
  visible: boolean;
}

export function DocumentTypeIndicator({ documentType, visible }: DocumentTypeIndicatorProps) {
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(visible && documentType ? 1 : 0, { duration: 200 }),
      transform: [
        {
          translateY: withSpring(visible && documentType ? 0 : 10, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  if (!documentType) {
    return null;
  }

  // Get icon for document type
  const icon = getDocumentIcon(documentType.type);

  // Get confidence color
  const confidenceColor = getConfidenceColor(documentType.confidence);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.typeText}>{documentType.displayName}</Text>
          <View style={styles.confidenceContainer}>
            <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
            <Text style={styles.confidenceText}>
              {Math.round(documentType.confidence * 100)}% confident
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function getDocumentIcon(type: string): string {
  switch (type) {
    case 'letter':
    case 'a4':
      return '📄';
    case 'receipt':
      return '🧾';
    case 'business_card':
      return '💼';
    case 'id_card':
      return '🪪';
    case 'photo':
      return '🖼️';
    default:
      return '📋';
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) {
    return '#22C55E'; // Green
  } else if (confidence >= 0.6) {
    return '#EAB308'; // Yellow
  } else {
    return '#EF4444'; // Red
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  icon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#999999',
  },
});
