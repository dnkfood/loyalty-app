import { useState, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

interface BiometricState {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: string | null;
}

interface UseBiometricReturn extends BiometricState {
  authenticate: () => Promise<boolean>;
  checkAvailability: () => Promise<void>;
}

export function useBiometric(): UseBiometricReturn {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    isEnrolled: false,
    biometricType: null,
  });

  const checkAvailability = useCallback(async () => {
    const isAvailable = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: string | null = null;
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'Face ID';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'Touch ID';
    }

    setState({ isAvailable, isEnrolled, biometricType });
  }, []);

  const authenticate = useCallback(async (): Promise<boolean> => {
    if (!state.isAvailable || !state.isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Войдите с помощью биометрии',
      cancelLabel: 'Отмена',
      fallbackLabel: 'Использовать пароль',
      disableDeviceFallback: false,
    });

    return result.success;
  }, [state.isAvailable, state.isEnrolled]);

  return {
    ...state,
    authenticate,
    checkAvailability,
  };
}
