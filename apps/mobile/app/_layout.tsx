import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth.store';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

function RootLayout() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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

export default function Layout() {
  return (
    <ErrorBoundary>
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
});
