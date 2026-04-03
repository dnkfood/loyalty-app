import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsGateway, SmsResult, SmsDeliveryStatus } from './sms-gateway.interface';

@Injectable()
export class BeelineSmsGateway implements SmsGateway {
  private readonly logger = new Logger(BeelineSmsGateway.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<SmsResult> {
    const apiUrl = this.configService.get<string>('app.sms.beeline.apiUrl');
    const apiKey = this.configService.get<string>('app.sms.beeline.apiKey');

    try {
      const response = await fetch(`${apiUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          to: phone,
          text: `Ваш код подтверждения: ${code}. Не сообщайте никому.`,
          from: 'LoyaltyApp',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Beeline SMS error: ${response.status} ${errorText}`);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json() as { message_id?: string };
      return { success: true, messageId: result.message_id };
    } catch (err) {
      this.logger.error(`Beeline SMS exception: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatus> {
    const apiUrl = this.configService.get<string>('app.sms.beeline.apiUrl');
    const apiKey = this.configService.get<string>('app.sms.beeline.apiKey');

    try {
      const response = await fetch(`${apiUrl}/status/${messageId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!response.ok) return 'unknown';

      const result = await response.json() as { status?: string };
      const statusMap: Record<string, SmsDeliveryStatus> = {
        delivered: 'delivered',
        failed: 'failed',
        pending: 'pending',
      };

      return statusMap[result.status ?? ''] ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
