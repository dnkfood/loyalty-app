import { apiClient } from './client';
import { getDeviceId, collectDeviceInfo } from '../utils/deviceInfo';
import type { ApiSuccessResponse, VerifyOtpResponse } from '@loyalty/shared-types';

function deviceHeaders() {
  return {
    'X-Device-Id': getDeviceId(),
    'X-Device-Info': collectDeviceInfo(),
  };
}

export async function sendOtp(phone: string): Promise<{ message: string }> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ message: string }>>(
    '/auth/send-otp',
    { phone },
  );
  return data.data;
}

export async function verifyOtp(
  phone: string,
  code: string,
  deviceId?: string,
): Promise<VerifyOtpResponse> {
  const { data } = await apiClient.post<ApiSuccessResponse<VerifyOtpResponse>>(
    '/auth/verify-otp',
    { phone, code, deviceId },
    { headers: deviceHeaders() },
  );
  return data.data;
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<{ accessToken: string; refreshToken: string }>
  >('/auth/refresh', { refreshToken }, { headers: deviceHeaders() });
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
