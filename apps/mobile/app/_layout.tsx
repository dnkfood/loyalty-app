import { useEffect, useState, Component, type ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ── Crash-proof ErrorBoundary that renders error to screen ──
interface EBProps { children: ReactNode }
interface EBState { error: Error | null }

class CrashGuard extends Component<EBProps, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  componentDidCatch(error: Error) { console.error('[CrashGuard]', error); }
  render() {
    if (this.state.error) {
      return (
        <View style={s.fatal}>
          <Text style={s.fatalTitle}>Crash Report</Text>
          <ScrollView style={s.scroll}>
            <Text style={s.mono}>{this.state.error.message}</Text>
            <Text style={s.mono}>{this.state.error.stack}</Text>
          </ScrollView>
          <TouchableOpacity style={s.btn} onPress={() => this.setState({ error: null })}>
            <Text style={s.btnTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Lazy-loaded main app ──
// Every import is dynamic to catch which module crashes
function AppLoader() {
  const [state, setState] = useState<
    { phase: 'loading' } |
    { phase: 'ready'; App: React.ComponentType } |
    { phase: 'error'; message: string; stack?: string }
  >({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        // Phase 1: load QueryClient
        setState({ phase: 'loading' });
        const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');

        // Phase 2: load auth store
        const { useAuthStore } = await import('../src/stores/auth.store');

        // Phase 3: wait for hydration
        await new Promise<void>((resolve) => {
          if (useAuthStore.persist.hasHydrated()) {
            resolve();
            return;
          }
          const unsub = useAuthStore.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
          // Timeout after 3 seconds
          setTimeout(resolve, 3000);
        });

        // Phase 4: load expo-router Stack
        const { Stack } = await import('expo-router');

        // Phase 5: build the app component
        const queryClient = new QueryClient({
          defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
        });

        function ReadyApp() {
          const isAuthenticated = useAuthStore((st) => st.isAuthenticated);
          return (
            <QueryClientProvider client={queryClient}>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" redirect={isAuthenticated} />
                <Stack.Screen name="(app)" redirect={!isAuthenticated} />
              </Stack>
            </QueryClientProvider>
          );
        }

        if (!cancelled) {
          setState({ phase: 'ready', App: ReadyApp });
        }
      } catch (err) {
        console.error('[Boot]', err);
        if (!cancelled) {
          const e = err instanceof Error ? err : new Error(String(err));
          setState({ phase: 'error', message: e.message, stack: e.stack });
        }
      }
    }

    void boot();
    return () => { cancelled = true; };
  }, []);

  if (state.phase === 'loading') {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={s.loadTxt}>Загрузка...</Text>
      </View>
    );
  }

  if (state.phase === 'error') {
    return (
      <View style={s.fatal}>
        <Text style={s.fatalTitle}>Boot Error</Text>
        <ScrollView style={s.scroll}>
          <Text style={s.mono}>{state.message}</Text>
          <Text style={s.mono}>{state.stack}</Text>
        </ScrollView>
      </View>
    );
  }

  const { App } = state;
  return <App />;
}

// ── Root export — absolutely minimal, wraps everything in CrashGuard ──
export default function Layout() {
  return (
    <CrashGuard>
      <AppLoader />
    </CrashGuard>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loadTxt: { marginTop: 12, color: '#666', fontSize: 16 },
  fatal: { flex: 1, backgroundColor: '#1a1a1a', padding: 20, paddingTop: 60 },
  fatalTitle: { color: '#ff4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  scroll: { flex: 1 },
  mono: { color: '#eee', fontSize: 12, fontFamily: 'monospace', marginBottom: 8 },
  btn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
