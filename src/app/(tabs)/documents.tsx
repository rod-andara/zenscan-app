import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useDocumentStore } from '../../stores/documentStore';
import { colors, spacing, typography } from '../../design/tokens';
import { Image } from 'react-native';

const { width } = Dimensions.get('window');
const numColumns = 2;
const itemWidth = (width - spacing.md * 3) / numColumns;

export default function DocumentsScreen() {
  const router = useRouter();
  const documents = useDocumentStore((state) => state.documents);
  const [debugTapCount, setDebugTapCount] = useState(0);

  const handleDebugTap = () => {
    const newCount = debugTapCount + 1;
    setDebugTapCount(newCount);

    if (newCount >= 5) {
      setDebugTapCount(0);
      router.push('/debug');
    }

    // Reset counter after 2 seconds
    setTimeout(() => setDebugTapCount(0), 2000);
  };

  if (documents.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📄</Text>
          <Text style={styles.emptyTitle}>No Documents Yet</Text>
          <Text style={styles.emptyText}>
            Scan your first document to get started
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={handleDebugTap} activeOpacity={1}>
        <Text style={styles.headerTitle}>My Documents</Text>
        <Text style={styles.headerSubtitle}>{documents.length} documents</Text>
      </TouchableOpacity>

      <FlatList
        data={documents}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const setCurrentDocument = useDocumentStore.getState().setCurrentDocument;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setCurrentDocument(item);
                router.push(`/document/${item.id}`);
              }}
            >
              <View style={styles.thumbnail}>
                {item.pages[0]?.uri ? (
                  <Image source={{ uri: item.pages[0].uri }} style={styles.thumbnailImage} />
                ) : (
                  <View style={styles.placeholderThumbnail}>
                    <Text style={styles.placeholderIcon}>📄</Text>
                  </View>
                )}
                {item.pages.length > 1 && (
                  <View style={styles.pageCountBadge}>
                    <Text style={styles.pageCountText}>{item.pages.length}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardPages}>{item.pages.length} {item.pages.length === 1 ? 'page' : 'pages'}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  header: {
    padding: spacing.md,
    paddingTop: spacing.xl + spacing.md,
  },
  headerTitle: {
    ...typography.heading,
    color: colors.text.primary.dark,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.secondary.dark,
  },
  grid: {
    padding: spacing.md,
  },
  card: {
    width: itemWidth,
    marginBottom: spacing.md,
    marginRight: spacing.md,
  },
  thumbnail: {
    width: itemWidth,
    height: itemWidth * 1.3,
    backgroundColor: colors.surface.dark,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
  },
  pageCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.primary.teal,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  pageCountText: {
    ...typography.caption,
    color: colors.text.primary.dark,
    fontSize: 12,
    fontWeight: '600',
  },
  cardInfo: {
    paddingHorizontal: spacing.xs,
  },
  cardTitle: {
    ...typography.body,
    color: colors.text.primary.dark,
    marginBottom: 2,
  },
  cardPages: {
    ...typography.caption,
    color: colors.text.secondary.dark,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.text.primary.dark,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary.dark,
    textAlign: 'center',
  },
});
