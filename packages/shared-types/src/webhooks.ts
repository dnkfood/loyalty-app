export type LoyaltyEventType =
  | 'balance.updated'
  | 'transaction.created'
  | 'status.changed'
  | 'offer.assigned'
  | 'offer.used'
  | 'offer.expired'
  | 'segment.changed';

export interface LoyaltyWebhookPayload {
  event_id: string;        // UUID v4, for idempotency
  event_type: LoyaltyEventType;
  occurred_at: string;     // ISO 8601
  guest_id: string;        // Guest ID in loyalty system
  data: Record<string, unknown>;
}

export interface TransactionCreatedData {
  transaction_id: string;
  type: 'earn' | 'spend' | 'expire' | 'correction';
  amount: number;
  description: string;
  new_balance: number;
}

export interface BalanceUpdatedData {
  old_balance: number;
  new_balance: number;
  reason: string;
}

export interface StatusChangedData {
  old_status: string;
  new_status: string;
  status_name: string;
  next_level_points?: number;
}

export interface OfferAssignedData {
  offer_id: string;
  offer_title: string;
  expires_at: string;
}

export interface SegmentChangedData {
  segment_ids: string[];
}
