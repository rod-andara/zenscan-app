import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

// Error boundary component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>
        The app encountered an error and needs to restart.
      </Text>
      <Text style={styles.errorDetails}>{error.message}</Text>
    </View>
  );
}

export default function RootLayout() {
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Safe initialization
    const initialize = async () => {
      try {
        // Add any async initialization here
        // For now, just mark as ready
        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize app:', err);
        setError(err as Error);
      }
    };

    initialize();
  }, []);

  // Global error handler
  useEffect(() => {
    const errorHandler = (error: Error) => {
      console.error('Uncaught error:', error);
      setError(error);
    };

    // This doesn't actually catch all errors in React Native
    // but it's a safety measure
    const globalAny = global as any;
    if (globalAny.ErrorUtils) {
      const originalHandler = globalAny.ErrorUtils.getGlobalHandler();
      globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
        if (isFatal) {
          errorHandler(error);
        }
        originalHandler(error, isFatal);
      });
    }

    return () => {
      if (globalAny.ErrorUtils) {
        globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal: boolean) => {
          console.error('Error:', error);
        });
      }
    };
  }, []);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="edit/index"
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom'
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorDetails: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
});
