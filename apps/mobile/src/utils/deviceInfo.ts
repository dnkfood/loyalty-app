import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Application from 'expo-application';

/**
 * Returns a stable device identifier.
 * On Android: android ID, on iOS: identifierForVendor.
 */
export function getDeviceId(): string {
  return Device.modelId ?? Device.modelName ?? 'unknown';
}

/**
 * Collects device info as a JSON string (max ~2KB).
 */
export function collectDeviceInfo(): string {
  const info = {
    platform: Platform.OS,
    osVersion: Platform.Version,
    brand: Device.brand,
    model: Device.modelName,
    deviceType: Device.deviceType,
    appVersion: Application.nativeApplicationVersion,
    buildVersion: Application.nativeBuildVersion,
  };
  const json = JSON.stringify(info);
  // Limit to 4KB
  return json.length > 4096 ? json.slice(0, 4096) : json;
}
