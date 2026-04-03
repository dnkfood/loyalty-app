import { apiClient } from './client';
import type { ApiSuccessResponse, VerifyOtpResponse } from '@loyalty/shared-types';

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
  );
  return data.data;
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { data } = await apiClient.post<
    ApiSuccessResponse<{ accessToken: string; refreshToken: string }>
  >('/auth/refresh', { refreshToken });
  return data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
