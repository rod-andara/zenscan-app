import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import { useDocumentStore } from '../../stores/documentStore';
import { colors, spacing, typography } from '../../design/tokens';
import { Image } from 'react-native';

const { width } = Dimensions.get('window');
const numColumns = 2;
const itemWidth = (width - spacing.md * 3) / numColumns;

export default function DocumentsScreen() {
  const documents = useDocumentStore((state) => state.documents);

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Documents</Text>
        <Text style={styles.headerSubtitle}>{documents.length} documents</Text>
      </View>

      <FlatList
        data={documents}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={styles.thumbnail}>
              {item.pages[0]?.uri ? (
                <Image source={{ uri: item.pages[0].uri }} style={styles.thumbnailImage} />
              ) : (
                <View style={styles.placeholderThumbnail}>
                  <Text style={styles.placeholderIcon}>📄</Text>
                </View>
              )}
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.cardPages}>{item.pages.length} pages</Text>
            </View>
          </TouchableOpacity>
        )}
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
