export interface SmsGateway {
  sendOtp(phone: string, code: string): Promise<SmsResult>;
  getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatus>;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type SmsDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'unknown';
