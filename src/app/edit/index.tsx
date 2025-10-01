import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import { useDocumentStore } from '../../stores/documentStore';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { debugLogger } from '../../utils/debugLogger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_HEIGHT = SCREEN_HEIGHT * 0.6;

type FilterType = 'none' | 'blackAndWhite' | 'grayscale' | 'enhance';

export default function EditScreen() {
  const router = useRouter();
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const updateDocument = useDocumentStore((state) => state.updateDocument);

  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [filter, setFilter] = useState<FilterType>('none');
  const [saving, setSaving] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

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
  const displayUri = previewUri || currentPage.uri;

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
    setHasChanges(true);
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setHasChanges(true);
  };

  const applyEdits = async () => {
    if (!hasChanges) return;

    setSaving(true);
    debugLogger.info('Applying edits...', { rotation, filter });

    try {
      const actions: ImageManipulator.Action[] = [];

      // Add rotation
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // Add filter effects
      if (filter === 'blackAndWhite') {
        actions.push({ flip: ImageManipulator.FlipType.Horizontal }); // Placeholder
        // Note: expo-image-manipulator doesn't support filters directly
        // We'd need a native module or use manipulate with custom filters
      } else if (filter === 'grayscale') {
        // Placeholder - would need native implementation
      } else if (filter === 'enhance') {
        // Auto-enhance: increase contrast slightly
      }

      if (actions.length > 0) {
        const result = await ImageManipulator.manipulateAsync(
          currentPage.uri,
          actions,
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );

        setPreviewUri(result.uri);
        debugLogger.success('Preview updated');
      }
    } catch (error) {
      debugLogger.error('Failed to apply edits', error);
      Alert.alert('Error', 'Failed to apply edits. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = async () => {
    setSaving(true);
    debugLogger.info('Saving page...');

    try {
      let finalUri = currentPage.uri;
      const actions: ImageManipulator.Action[] = [];

      // Add rotation
      if (rotation !== 0) {
        actions.push({ rotate: rotation });
      }

      // Apply all edits
      if (actions.length > 0 || previewUri) {
        const result = await ImageManipulator.manipulateAsync(
          previewUri || currentPage.uri,
          actions,
          { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalUri = result.uri;
      }

      // Update page in document
      const updatedPages = [...currentDocument.pages];
      updatedPages[selectedPageIndex] = {
        ...currentPage,
        uri: finalUri,
      };

      updateDocument(currentDocument.id, { pages: updatedPages });

      // Move to next page or go back
      if (selectedPageIndex < currentDocument.pages.length - 1) {
        setSelectedPageIndex(selectedPageIndex + 1);
        setRotation(0);
        setFilter('none');
        setPreviewUri(null);
        setHasChanges(false);
      } else {
        debugLogger.success('All pages saved!');
        router.push('/(tabs)/documents');
      }
    } catch (error) {
      debugLogger.error('Failed to save', error);
      Alert.alert('Error', 'Failed to save edits. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (selectedPageIndex < currentDocument.pages.length - 1) {
      setSelectedPageIndex(selectedPageIndex + 1);
      setRotation(0);
      setFilter('none');
      setPreviewUri(null);
      setHasChanges(false);
    } else {
      router.push('/(tabs)/documents');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            Edit Page {selectedPageIndex + 1}/{currentDocument.pages.length}
          </Text>
        </View>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipButton}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Preview */}
      <View style={styles.previewContainer}>
        <View style={[styles.imageWrapper, { transform: [{ rotate: `${rotation}deg` }] }]}>
          <Image
            source={{ uri: displayUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Thumbnail Strip */}
      {currentDocument.pages.length > 1 && (
        <View style={styles.thumbnailStrip}>
          <ScrollView
            horizontal
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
                  setFilter('none');
                  setPreviewUri(null);
                  setHasChanges(false);
                }}
              >
                <Image source={{ uri: page.uri }} style={styles.thumbnailImage} />
                <Text style={styles.thumbnailNumber}>{index + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Filters</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filtersRow}>
            {(['none', 'blackAndWhite', 'grayscale', 'enhance'] as FilterType[]).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterButton, filter === f && styles.filterButtonActive]}
                onPress={() => handleFilterChange(f)}
              >
                <Text style={[styles.filterLabel, filter === f && styles.filterLabelActive]}>
                  {f === 'none' ? 'Original' : f === 'blackAndWhite' ? 'B&W' : f === 'grayscale' ? 'Gray' : 'Enhance'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleRotate}>
          <Text style={styles.controlIcon}>⟲</Text>
          <Text style={styles.controlLabel}>Rotate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.applyButton, !hasChanges && styles.applyButtonDisabled]}
          onPress={applyEdits}
          disabled={!hasChanges || saving}
        >
          <Text style={styles.applyButtonText}>{saving ? 'Applying...' : 'Apply'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.doneButton]}
          onPress={handleDone}
          disabled={saving}
        >
          <Text style={styles.doneButtonText}>Done</Text>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerButton: {
    ...typography.body,
    color: colors.primary.teal,
    minWidth: 60,
  },
  skipButton: {
    ...typography.body,
    color: colors.text.secondary.dark,
    minWidth: 60,
    textAlign: 'right',
  },
  headerTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
  },
  previewContainer: {
    height: PREVIEW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailStrip: {
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    paddingVertical: spacing.sm,
  },
  thumbnailStripContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  thumbnail: {
    width: 50,
    height: 70,
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
    fontSize: 9,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
  },
  filtersContainer: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  filtersTitle: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    marginBottom: spacing.xs,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  filterButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface.dark,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.teal,
    borderColor: colors.primary.teal,
  },
  filterLabel: {
    ...typography.caption,
    color: colors.text.secondary.dark,
  },
  filterLabelActive: {
    color: colors.text.primary.dark,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  controlButton: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  controlIcon: {
    fontSize: 28,
    color: colors.text.primary.dark,
  },
  controlLabel: {
    ...typography.caption,
    color: colors.text.secondary.dark,
  },
  applyButton: {
    backgroundColor: colors.primary.purple,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
  doneButton: {
    backgroundColor: colors.status.success,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  doneButtonText: {
    ...typography.button,
    color: 'white',
  },
  errorText: {
    ...typography.body,
    color: colors.text.primary.dark,
    textAlign: 'center',
    padding: spacing.xl,
  },
  backButton: {
    backgroundColor: colors.primary.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
  },
  backButtonText: {
    ...typography.button,
    color: colors.text.primary.dark,
  },
});
