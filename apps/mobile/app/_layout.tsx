import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Component, type ReactNode } from 'react';

// ── ErrorBoundary ──
interface EBProps { children: ReactNode }
interface EBState { hasError: boolean; error: Error | null }

class AppErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error): EBState { return { hasError: true, error }; }
  componentDidCatch(error: Error) { console.error('[AppError]', error); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={s.fatal}>
          <Text style={s.fatalTitle}>Ошибка приложения</Text>
          <ScrollView style={s.scroll}>
            <Text style={s.mono}>{this.state.error?.message}</Text>
          </ScrollView>
          <TouchableOpacity style={s.btn} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={s.btnTxt}>Попробовать снова</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Auth hydration hook ──
function useAuthHydration() {
  const [state, setState] = useState({ ready: false, authenticated: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/consistent-type-imports
        const { useAuthStore } = require('../src/stores/auth.store') as typeof import('../src/stores/auth.store');
        const check = () => {
          if (!cancelled) {
            setState({ ready: true, authenticated: useAuthStore.getState().isAuthenticated });
          }
        };
        if (useAuthStore.persist.hasHydrated()) {
          check();
        }
        useAuthStore.persist.onFinishHydration(check);
        useAuthStore.subscribe(() => {
          if (!cancelled) {
            setState({ ready: true, authenticated: useAuthStore.getState().isAuthenticated });
          }
        });
        // Timeout fallback
        setTimeout(() => { if (!cancelled && !state.ready) setState({ ready: true, authenticated: false }); }, 3000);
      } catch (err) {
        console.error('[AuthInit]', err);
        if (!cancelled) setState({ ready: true, authenticated: false });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}

// ── QueryClient ──
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// ── Root layout ──
function RootLayout() {
  const { ready, authenticated } = useAuthHydration();

  if (!ready) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={s.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" redirect={authenticated} />
      <Stack.Screen name="(app)" redirect={!authenticated} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <RootLayout />
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}

const s = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#666', fontSize: 16 },
  fatal: { flex: 1, backgroundColor: '#1a1a1a', padding: 20, paddingTop: 60 },
  fatalTitle: { color: '#ff4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  scroll: { flex: 1 },
  mono: { color: '#eee', fontSize: 12, fontFamily: 'monospace' },
  btn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
