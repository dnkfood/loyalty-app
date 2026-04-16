import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthUser {
  id: string;
  phone: string;
  name: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  needsRegistration: boolean;
  _hasHydrated: boolean;
  setAuth: (accessToken: string, user: AuthUser) => void;
  setNeedsRegistration: (value: boolean) => void;
  logout: () => void;
}

// Safe storage wrapper — if AsyncStorage throws, fall back to in-memory
const safeStorage = createJSONStorage(() => ({
  getItem: async (key: string) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (err) {
      console.error('[AuthStore] AsyncStorage.getItem failed:', err);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (err) {
      console.error('[AuthStore] AsyncStorage.setItem failed:', err);
    }
  },
  removeItem: async (key: string) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.error('[AuthStore] AsyncStorage.removeItem failed:', err);
    }
  },
}));

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      needsRegistration: false,
      _hasHydrated: false,

      setAuth: (accessToken, user) =>
        set({ accessToken, user, isAuthenticated: true }),

      setNeedsRegistration: (value) =>
        set({ needsRegistration: value }),

      logout: () =>
        set({ accessToken: null, user: null, isAuthenticated: false, needsRegistration: false }),
    }),
    {
      name: 'auth-storage',
      storage: safeStorage,
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        needsRegistration: state.needsRegistration,
      }),
    },
  ),
);

// Track hydration — must be AFTER store creation to avoid TDZ
try {
  if (useAuthStore.persist.hasHydrated()) {
    useAuthStore.setState({ _hasHydrated: true });
  }
  useAuthStore.persist.onFinishHydration(() => {
    useAuthStore.setState({ _hasHydrated: true });
  });
} catch (err) {
  console.error('[AuthStore] Hydration tracking failed:', err);
  // Force hydrated so the app doesn't hang on the loading screen
  useAuthStore.setState({ _hasHydrated: true });
}
