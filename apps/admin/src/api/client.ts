import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from '../stores/auth.store';

const BASE_URL = import.meta.env.VITE_BFF_URL as string ?? 'http://localhost:3100/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
});

// Request interceptor: attach access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401
const LOGIN_URL = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/login`;

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401
    ) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== LOGIN_URL) {
        window.location.href = LOGIN_URL;
      }
    }
    return Promise.reject(error);
  },
);
