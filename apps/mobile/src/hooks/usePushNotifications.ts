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
  if (!Device.isDevice) {
    console.warn('[push] skipped: not a physical device');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') {
    console.warn('[push] permission not granted');
    return null;
  }

  const { data: token } = await Notifications.getDevicePushTokenAsync();
  return typeof token === 'string' ? token : null;
}

export function usePushNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sentTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      sentTokenRef.current = null;
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const token = await registerForPushAsync();
        if (cancelled || !token || sentTokenRef.current === token) return;

        await apiClient.post('/devices/push-token', {
          token,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
        });
        sentTokenRef.current = token;
      } catch (err) {
        console.error('[push] registration failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
