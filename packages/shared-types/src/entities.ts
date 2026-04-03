import { StaffRole } from './enums';

export interface User {
  id: string;
  phone: string;
  externalGuestId?: string | null;
  name?: string | null;
  email?: string | null;
  birthDate?: Date | null;
  avatarUrl?: string | null;
  consentGiven: boolean;
  consentGivenAt?: Date | null;
  consentVersion?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  id: string;
  userId: string;
  refreshToken: string; // bcrypt hash
  deviceId?: string | null;
  deviceInfo?: Record<string, unknown> | null;
  ipAddress?: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface OtpCode {
  id: string;
  phone: string;
  codeHash: string; // bcrypt hash
  attempts: number;
  expiresAt: Date;
  usedAt?: Date | null;
  createdAt: Date;
}

export interface LoyaltyCache {
  userId: string;
  externalGuestId: string;
  balance: number;
  statusLevel: string;
  statusName: string;
  nextLevelPoints?: number | null;
  segmentIds: string[];
  isCached: boolean;
  cachedAt: Date;
  updatedAt: Date;
}

export interface TransactionLog {
  id: string;
  eventId: string; // idempotency key
  externalGuestId: string;
  transactionId: string;
  type: 'earn' | 'spend' | 'expire' | 'correction';
  amount: number;
  newBalance: number;
  description?: string | null;
  occurredAt: Date;
  processedAt: Date;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  title: string;
  templateId?: string | null;
  body: string;
  data?: Record<string, unknown> | null;
  segmentIds: string[];
  status: 'draft' | 'scheduled' | 'running' | 'done' | 'failed';
  scheduledAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  sentCount: number;
  createdById: string;
  createdAt: Date;
}

export interface PushNotificationLog {
  id: string;
  campaignId?: string | null;
  userId: string;
  token: string;
  status: 'sent' | 'delivered' | 'failed' | 'opened' | 'converted';
  errorCode?: string | null;
  sentAt: Date;
  deliveredAt?: Date | null;
  openedAt?: Date | null;
}

export interface StaffUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: StaffRole;
  totpSecret?: string | null;
  totpEnabled: boolean;
  isActive: boolean;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  staffUserId: string;
  action: string;
  targetEntity?: string | null;
  targetId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}
