import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Clipboard,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { debugLogger, LogEntry } from '../utils/debugLogger';
import { useDocumentStore } from '../stores/documentStore';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { colors, spacing, typography, borderRadius } from '../design/tokens';

export default function DebugScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const documents = useDocumentStore((state) => state.documents);
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const subscriptionState = useSubscriptionStore();

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe(setLogs);
    setLogs(debugLogger.getLogs());
    return unsubscribe;
  }, []);

  const handleCopyLogs = () => {
    const formattedLogs = debugLogger.getFormattedLogs();
    Clipboard.setString(formattedLogs);
    Alert.alert('Copied!', 'Debug logs copied to clipboard');
  };

  const handleCopyState = () => {
    const state = {
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        pagesCount: d.pages.length,
        pages: d.pages.map((p) => ({ id: p.id, uri: p.uri.substring(0, 50) + '...' })),
      })),
      currentDocument: currentDocument
        ? {
            id: currentDocument.id,
            title: currentDocument.title,
            pagesCount: currentDocument.pages.length,
          }
        : null,
      subscription: {
        isPremium: subscriptionState.isPremium,
        trialActive: subscriptionState.trialActive,
      },
    };
    Clipboard.setString(JSON.stringify(state, null, 2));
    Alert.alert('Copied!', 'App state copied to clipboard');
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#FF4444';
      case 'warn':
        return '#FFA500';
      case 'success':
        return '#00CC66';
      default:
        return colors.text.primary.dark;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Debug Console</Text>
        <TouchableOpacity onPress={() => debugLogger.clear()}>
          <Text style={styles.clearButton}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* State Summary */}
      <View style={styles.stateSection}>
        <Text style={styles.sectionTitle}>App State</Text>
        <View style={styles.stateRow}>
          <Text style={styles.stateLabel}>Documents:</Text>
          <Text style={styles.stateValue}>{documents.length}</Text>
        </View>
        <View style={styles.stateRow}>
          <Text style={styles.stateLabel}>Current Doc:</Text>
          <Text style={styles.stateValue}>
            {currentDocument ? currentDocument.title : 'None'}
          </Text>
        </View>
        <View style={styles.stateRow}>
          <Text style={styles.stateLabel}>Premium:</Text>
          <Text style={styles.stateValue}>
            {subscriptionState.isPremium ? 'Yes' : 'No'}
          </Text>
        </View>
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyState}>
          <Text style={styles.copyButtonText}>Copy Full State</Text>
        </TouchableOpacity>
      </View>

      {/* Logs */}
      <View style={styles.logsSection}>
        <View style={styles.logHeader}>
          <Text style={styles.sectionTitle}>Logs ({logs.length})</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyLogs}>
            <Text style={styles.copyButtonText}>Copy Logs</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.logsList} contentContainerStyle={styles.logsContent}>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No logs yet. Perform some actions to see logs.</Text>
          ) : (
            logs.map((log, index) => (
              <View key={index} style={styles.logEntry}>
                <View style={styles.logHeader}>
                  <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>
                    [{log.level.toUpperCase()}]
                  </Text>
                  <Text style={styles.logTime}>
                    {log.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.logMessage}>{log.message}</Text>
                {log.data && (
                  <Text style={styles.logData}>{JSON.stringify(log.data, null, 2)}</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
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
  backButton: {
    ...typography.body,
    color: colors.primary.teal,
  },
  headerTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
  },
  clearButton: {
    ...typography.body,
    color: colors.primary.purple,
  },
  stateSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.text.primary.dark,
    marginBottom: spacing.sm,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  stateLabel: {
    ...typography.body,
    color: colors.text.secondary.dark,
  },
  stateValue: {
    ...typography.body,
    color: colors.text.primary.dark,
    fontWeight: '600',
  },
  copyButton: {
    backgroundColor: colors.surface.dark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  copyButtonText: {
    ...typography.caption,
    color: colors.primary.teal,
    fontWeight: '600',
  },
  logsSection: {
    flex: 1,
    padding: spacing.md,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logsList: {
    flex: 1,
  },
  logsContent: {
    paddingBottom: spacing.lg,
  },
  logEntry: {
    backgroundColor: colors.surface.dark,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.teal,
  },
  logLevel: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  logTime: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    fontSize: 11,
  },
  logMessage: {
    ...typography.body,
    color: colors.text.primary.dark,
    marginTop: spacing.xs,
  },
  logData: {
    ...typography.caption,
    color: colors.text.secondary.dark,
    marginTop: spacing.xs,
    fontFamily: 'Courier',
    backgroundColor: colors.background.dark,
    padding: spacing.xs,
    borderRadius: 4,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary.dark,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
