export const ErrorCodes = {
  // Auth
  PHONE_INVALID: 'PHONE_INVALID',
  OTP_SENT: 'OTP_SENT',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_MAX_ATTEMPTS: 'OTP_MAX_ATTEMPTS',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  // Loyalty
  GUEST_NOT_FOUND: 'GUEST_NOT_FOUND',
  LOYALTY_SYSTEM_UNAVAILABLE: 'LOYALTY_SYSTEM_UNAVAILABLE',
  // General
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ApiMeta {
  requestId?: string;
  page?: number;
  limit?: number;
  total?: number;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: ApiMeta;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SendOtpRequest {
  phone: string;
}

export interface SendOtpResponse {
  message: string;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
  deviceId?: string;
}

export interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    name?: string | null;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LoyaltyBalanceResponse {
  balance: number;
  statusLevel: string;
  statusName: string;
  nextLevelPoints?: number | null;
  bonusPercent: number;
  cardCode: string;
  guestName: string | null;
  /**
   * Accumulated spend toward the next status level (loyalty `summa_a` field).
   * Falls back to `balance` if the loyalty system doesn't expose it.
   */
  currentSpend: number;
  isCached: boolean;
  cachedAt?: Date;
}

export interface TransactionListResponse {
  items: TransactionItem[];
  total: number;
  page: number;
  limit: number;
}

export interface TransactionItem {
  id: string;
  type: 'earn' | 'spend' | 'expire' | 'correction';
  amount: number;
  newBalance: number;
  description?: string | null;
  occurredAt: Date;
}

export interface LoyaltyCardResponse {
  qrData: string;
  externalGuestId: string;
  cardNumber?: string;
}
