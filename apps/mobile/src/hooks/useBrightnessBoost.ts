import { useEffect } from 'react';
import * as Brightness from 'expo-brightness';

/**
 * Boost screen brightness to maximum while a screen is mounted.
 * Restores the previous brightness on unmount.
 */
export function useBrightnessBoost() {
  useEffect(() => {
    let cancelled = false;
    let original: number | null = null;

    (async () => {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        try {
          original = await Brightness.getBrightnessAsync();
        } catch {
          original = null;
        }
        if (cancelled) return;
        await Brightness.setBrightnessAsync(1);
      } catch (err) {
        console.warn('[Brightness] boost failed', err);
      }
    })();

    return () => {
      cancelled = true;
      (async () => {
        try {
          if (original != null) {
            await Brightness.setBrightnessAsync(original);
          } else {
            await Brightness.useSystemBrightnessAsync();
          }
        } catch {
          /* ignore */
        }
      })();
    };
  }, []);
}
