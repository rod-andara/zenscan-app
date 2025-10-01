/**
 * Page Reordering Screen
 * Drag-and-drop interface for reordering document pages
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDocumentStore } from '../../stores/documentStore';
import { Page } from '../../types';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';
import { debugLogger } from '../../utils/debugLogger';

export default function ReorderScreen() {
  const router = useRouter();
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const updateDocument = useDocumentStore((state) => state.updateDocument);

  if (!currentDocument) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No document to reorder</Text>
      </View>
    );
  }

  const [pages, setPages] = useState(currentDocument.pages);

  const handleSave = () => {
    // Update order field for each page
    const reorderedPages = pages.map((page, index) => ({
      ...page,
      order: index,
    }));

    updateDocument(currentDocument.id, { pages: reorderedPages });
    debugLogger.success('Pages reordered');
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Page>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[styles.pageItem, isActive && styles.pageItemActive]}
          onLongPress={drag}
          disabled={isActive}
        >
          <View style={styles.dragHandle}>
            <Text style={styles.dragIcon}>☰</Text>
          </View>
          <Image source={{ uri: item.uri }} style={styles.pageImage} resizeMode="cover" />
          <View style={styles.pageInfo}>
            <Text style={styles.pageTitle}>Page {item.order + 1}</Text>
            <Text style={styles.pageHint}>Long press to drag</Text>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reorder Pages</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Draggable List */}
      <DraggableFlatList
        data={pages}
        onDragEnd={({ data }) => setPages(data)}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </GestureHandlerRootView>
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
  headerButton: {
    ...typography.body,
    color: colors.primary.teal,
    minWidth: 60,
  },
  saveButton: {
    color: colors.status.success,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
  },
  listContent: {
    padding: spacing.md,
  },
  pageItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  pageItemActive: {
    backgroundColor: colors.primary.teal,
    opacity: 0.8,
  },
  dragHandle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  dragIcon: {
    fontSize: 24,
    color: colors.text.secondary.dark,
  },
  pageImage: {
    width: 60,
    height: 80,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
  },
  pageInfo: {
    flex: 1,
  },
  pageTitle: {
    ...typography.body,
    color: colors.text.primary.dark,
    marginBottom: spacing.xs,
  },
  pageHint: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    fontSize: 11,
  },
  errorText: {
    ...typography.body,
    color: colors.text.primary.dark,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
