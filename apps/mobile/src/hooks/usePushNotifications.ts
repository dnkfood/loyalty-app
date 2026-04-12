import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/auth.store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushAsync(): Promise<string | null> {
  console.log('[push] registerForPushAsync: start', {
    platform: Platform.OS,
    isDevice: Device.isDevice,
    brand: Device.brand,
    modelName: Device.modelName,
  });

  if (!Device.isDevice) {
    console.warn('[push] skipped: not a physical device');
    return null;
  }

  if (Platform.OS === 'android') {
    console.log('[push] creating Android channel "default"');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
    console.log('[push] Android channel created');
  }

  console.log('[push] checking existing permissions');
  const { status: existing } = await Notifications.getPermissionsAsync();
  console.log('[push] getPermissionsAsync result:', existing);

  let status = existing;
  if (existing !== 'granted') {
    console.log('[push] requesting permissions');
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
    console.log('[push] requestPermissionsAsync result:', status);
  }
  if (status !== 'granted') {
    console.warn('[push] permission not granted, aborting');
    return null;
  }

  console.log('[push] calling getDevicePushTokenAsync');
  const tokenResult = await Notifications.getDevicePushTokenAsync();
  console.log('[push] getDevicePushTokenAsync raw result:', {
    type: tokenResult.type,
    dataType: typeof tokenResult.data,
  });

  const token = tokenResult.data;
  if (typeof token !== 'string') {
    console.warn('[push] token is not a string, got:', typeof token);
    return null;
  }

  console.log('[push] FCM token (first 20 chars):', token.slice(0, 20), `(length: ${token.length})`);
  return token;
}

export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sentTokenRef = useRef<string | null>(null);

  useEffect(() => {
    console.log('[push] hook effect, isAuthenticated:', isAuthenticated);

    if (!isAuthenticated) {
      sentTokenRef.current = null;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await registerForPushAsync();
        if (cancelled) {
          console.log('[push] effect cancelled before POST');
          return;
        }
        if (!token) {
          console.log('[push] no token returned, skipping POST');
          return;
        }
        if (sentTokenRef.current === token) {
          console.log('[push] token unchanged, skipping POST');
          return;
        }

        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        console.log('[push] POST /devices/push-token', { platform });
        const res = await apiClient.post('/devices/push-token', { token, platform });
        console.log('[push] POST success, status:', res.status, 'data:', res.data);
        sentTokenRef.current = token;
      } catch (err) {
        const e = err as { message?: string; code?: string; response?: { status?: number; data?: unknown } };
        console.error('[push] registration failed', {
          message: e?.message,
          code: e?.code,
          status: e?.response?.status,
          responseData: e?.response?.data,
          stack: (err as Error)?.stack,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
