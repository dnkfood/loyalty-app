import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  accessToken: string | null;
  user: StaffUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (accessToken: string, user: StaffUser) => void;
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
      name: 'admin-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// Track hydration — must be AFTER store creation to avoid TDZ reference error.
// hasHydrated() covers synchronous storage (localStorage);
// onFinishHydration() covers async storage if ever used.
if (useAuthStore.persist.hasHydrated()) {
  useAuthStore.setState({ _hasHydrated: true });
}
useAuthStore.persist.onFinishHydration(() => {
  useAuthStore.setState({ _hasHydrated: true });
});
