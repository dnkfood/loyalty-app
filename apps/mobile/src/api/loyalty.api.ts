import { apiClient } from './client';
import type {
  ApiSuccessResponse,
  LoyaltyBalanceResponse,
  TransactionListResponse,
  LoyaltyCardResponse,
} from '@loyalty/shared-types';

export async function getBalance(): Promise<LoyaltyBalanceResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<LoyaltyBalanceResponse>>(
    '/loyalty/balance',
  );
  return data.data;
}

export async function getTransactions(
  page = 1,
  limit = 20,
): Promise<TransactionListResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<TransactionListResponse>>(
    '/loyalty/transactions',
    { params: { page, limit } },
  );
  return data.data;
}

export async function getLoyaltyCard(): Promise<LoyaltyCardResponse> {
  const { data } = await apiClient.get<ApiSuccessResponse<LoyaltyCardResponse>>(
    '/loyalty/card',
  );
  return data.data;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  expiresAt?: string;
  discount?: number;
}

export async function getOffers(): Promise<Offer[]> {
  const { data } = await apiClient.get<ApiSuccessResponse<Offer[]>>('/offers');
  return data.data;
}
