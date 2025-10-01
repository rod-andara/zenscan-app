import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useDocumentStore } from '../../stores/documentStore';
import { colors, spacing, typography, borderRadius } from '../../design/tokens';

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const document = useDocumentStore((state) =>
    state.documents.find((doc) => doc.id === id)
  );
  const deleteDocument = useDocumentStore((state) => state.deleteDocument);
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);

  if (!document) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Document not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleEdit = () => {
    setCurrentDocument(document);
    router.push('/edit/');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteDocument(document.id);
            router.back();
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      // For now, share the first page URI
      // TODO: Implement PDF export and share that instead
      if (document.pages[0]?.uri) {
        await Share.share({
          message: document.title,
          url: document.pages[0].uri,
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {document.title}
        </Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={[styles.headerButton, styles.deleteButton]}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Document Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {document.pages.length} {document.pages.length === 1 ? 'page' : 'pages'}
        </Text>
        <Text style={styles.infoText}>
          Created {new Date(document.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {/* Pages */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Pages</Text>
        {document.pages.map((page, index) => (
          <View key={page.id} style={styles.pageCard}>
            <Image source={{ uri: page.uri }} style={styles.pageImage} resizeMode="contain" />
            <Text style={styles.pageNumber}>Page {index + 1}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionLabel}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.actionButtonDisabled]}>
          <Text style={styles.actionIcon}>📄</Text>
          <Text style={styles.actionLabel}>PDF</Text>
          <Text style={styles.comingSoon}>(Soon)</Text>
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
  headerButton: {
    ...typography.body,
    color: colors.primary.teal,
    minWidth: 60,
  },
  deleteButton: {
    color: colors.status.error,
  },
  headerTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: colors.surface.dark,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  infoText: {
    ...typography.caption,
    color: colors.text.secondary.dark,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
    marginBottom: spacing.md,
  },
  pageCard: {
    backgroundColor: colors.surface.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pageImage: {
    width: '100%',
    height: 400,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  pageNumber: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    backgroundColor: colors.surface.dark,
  },
  actionButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  actionLabel: {
    ...typography.caption,
    color: colors.text.primary.dark,
  },
  comingSoon: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    fontSize: 10,
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
