import { apiClient } from './client';
import type { ApiSuccessResponse } from '@loyalty/shared-types';

export interface UserProfile {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
  consentGiven: boolean;
  consentGivenAt: string | null;
  consentVersion: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  birthDate?: string;
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<ApiSuccessResponse<UserProfile>>('/profile');
  return data.data;
}

export async function updateProfile(profileData: UpdateProfileData): Promise<UserProfile> {
  const { data } = await apiClient.patch<ApiSuccessResponse<UserProfile>>(
    '/profile',
    profileData,
  );
  return data.data;
}

export async function recordConsent(consentVersion: string): Promise<{ success: boolean }> {
  const { data } = await apiClient.post<ApiSuccessResponse<{ success: boolean }>>(
    '/profile/consent',
    { consentVersion },
  );
  return data.data;
}
