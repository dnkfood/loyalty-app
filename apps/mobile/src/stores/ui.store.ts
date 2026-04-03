import { create } from 'zustand';

interface UiState {
  isLoading: boolean;
  globalError: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isLoading: false,
  globalError: null,
  setLoading: (isLoading) => set({ isLoading }),
  setError: (globalError) => set({ globalError }),
  clearError: () => set({ globalError: null }),
}));
