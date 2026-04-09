import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

// Global unhandled error/rejection handler
if (typeof ErrorUtils !== 'undefined') {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GlobalError]', isFatal ? 'FATAL' : 'non-fatal', error);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function useAuthStoreHydration(): { hasHydrated: boolean; isAuthenticated: boolean } {
  const [state, setState] = useState({ hasHydrated: false, isAuthenticated: false });

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Dynamic import to catch any module-level errors in auth.store
        const { useAuthStore } = await import('../src/stores/auth.store');

        // Wait for hydration
        if (useAuthStore.persist.hasHydrated()) {
          if (!cancelled) {
            const s = useAuthStore.getState();
            setState({ hasHydrated: true, isAuthenticated: s.isAuthenticated });
          }
        }

        useAuthStore.persist.onFinishHydration(() => {
          if (!cancelled) {
            const s = useAuthStore.getState();
            setState({ hasHydrated: true, isAuthenticated: s.isAuthenticated });
          }
        });

        // Also subscribe to auth changes
        useAuthStore.subscribe((s) => {
          if (!cancelled) {
            setState({ hasHydrated: true, isAuthenticated: s.isAuthenticated });
          }
        });
      } catch (err) {
        console.error('[AuthInit] Failed to initialize auth store:', err);
        if (!cancelled) {
          // Auth store failed — proceed as unauthenticated
          setState({ hasHydrated: true, isAuthenticated: false });
        }
      }
    }

    void init();
    return () => { cancelled = true; };
  }, []);

  return state;
}

function RootLayout() {
  const { hasHydrated, isAuthenticated } = useAuthStoreHydration();

  if (!hasHydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" redirect={isAuthenticated} />
      <Stack.Screen name="(app)" redirect={!isAuthenticated} />
    </Stack>
  );
}

function FatalErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <View style={styles.fatal}>
      <Text style={styles.fatalTitle}>Loyalty App</Text>
      <Text style={styles.fatalMessage}>
        Не удалось запустить приложение
      </Text>
      <Text style={styles.fatalDetail}>{error.message}</Text>
      <TouchableOpacity style={styles.fatalButton} onPress={onRetry}>
        <Text style={styles.fatalButtonText}>Попробовать снова</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function Layout() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetError }) => (
        <FatalErrorScreen error={error} onRetry={resetError} />
      )}
    >
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <RootLayout />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  fatal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },
  fatalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  fatalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  fatalDetail: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'monospace',
  },
  fatalButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  fatalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
