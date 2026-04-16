// Polyfill TextEncoder/TextDecoder for older Android devices
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const te = require('text-encoding');
  globalThis.TextEncoder = te.TextEncoder;
  globalThis.TextDecoder = te.TextDecoder;
}

import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Component, type ReactNode } from 'react';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { useAuthStore } from '../src/stores/auth.store';
import { getRefreshToken, saveTokens, clearTokens } from '../src/utils/token';
import axios from 'axios';

const BASE_URL =
  (process.env.EXPO_PUBLIC_BFF_URL as string | undefined) ?? 'http://45.84.87.169:3000/api/v1';

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

// ── Auth session restore hook ──
function useAuthSession() {
  const [state, setState] = useState({ ready: false, authenticated: false });
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    let cancelled = false;

    async function waitForHydration(): Promise<void> {
      if (useAuthStore.persist.hasHydrated()) return;
      return new Promise((resolve) => {
        useAuthStore.persist.onFinishHydration(() => resolve());
      });
    }

    async function restore() {
      try {
        await waitForHydration();

        // Check if we have a refresh token in SecureStore
        const refreshToken = await getRefreshToken();

        if (!refreshToken) {
          // No refresh token — user never logged in or explicitly logged out
          if (!cancelled) setState({ ready: true, authenticated: false });
          return;
        }

        // We have a refresh token — try to get a fresh access token
        try {
          const { data } = await axios.post<{
            data: { accessToken: string; refreshToken: string };
          }>(`${BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 10_000 });

          const { accessToken, refreshToken: newRefreshToken } = data.data;

          await saveTokens(accessToken, newRefreshToken);

          // Restore user from Zustand store (persisted in AsyncStorage)
          const storedUser = useAuthStore.getState().user;
          if (storedUser) {
            useAuthStore.getState().setAuth(accessToken, storedUser);
          }

          if (!cancelled) setState({ ready: true, authenticated: true });
        } catch (refreshErr) {
          // If server explicitly rejected (401/403) — session is dead
          if (
            axios.isAxiosError(refreshErr) &&
            refreshErr.response &&
            (refreshErr.response.status === 401 || refreshErr.response.status === 403)
          ) {
            await clearTokens();
            useAuthStore.getState().logout();
            if (!cancelled) setState({ ready: true, authenticated: false });
          } else {
            // Network error / timeout — stay authenticated optimistically
            // using cached auth from Zustand (accessToken might still work)
            const wasAuthenticated = useAuthStore.getState().isAuthenticated;
            if (!cancelled) setState({ ready: true, authenticated: wasAuthenticated });
          }
        }
      } catch (err) {
        console.error('[AuthSession] restore failed:', err);
        if (!cancelled) setState({ ready: true, authenticated: false });
      }
    }

    void restore();
    return () => { cancelled = true; };
  }, []);

  // Also track live auth state changes (login/logout during session)
  useEffect(() => {
    const unsub = useAuthStore.subscribe((s) => {
      setState((prev) => {
        if (!prev.ready) return prev;
        return { ready: true, authenticated: s.isAuthenticated };
      });
    });
    return unsub;
  }, []);

  return state;
}

// ── QueryClient ──
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

// ── Root layout ──
function RootLayout() {
  const { ready, authenticated } = useAuthSession();
  usePushNotifications();

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
