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
  _hasHydrated: boolean;
  setAuth: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (accessToken, user) =>
        set({ accessToken, user, isAuthenticated: true }),

      logout: () =>
        set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Track hydration — must be AFTER store creation to avoid TDZ
if (useAuthStore.persist.hasHydrated()) {
  useAuthStore.setState({ _hasHydrated: true });
}
useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.setState({ _hasHydrated: true });
});
