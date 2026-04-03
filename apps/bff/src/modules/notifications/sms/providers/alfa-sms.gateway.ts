import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsGateway, SmsResult, SmsDeliveryStatus } from './sms-gateway.interface';

@Injectable()
export class AlfaSmsGateway implements SmsGateway {
  private readonly logger = new Logger(AlfaSmsGateway.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<SmsResult> {
    const apiUrl = this.configService.get<string>('app.sms.alfa.apiUrl');
    const login = this.configService.get<string>('app.sms.alfa.login');
    const password = this.configService.get<string>('app.sms.alfa.password');

    try {
      const params = new URLSearchParams({
        login: login ?? '',
        password: password ?? '',
        phone,
        message: `Ваш код подтверждения: ${code}. Не сообщайте никому.`,
        name: 'LoyaltyApp',
      });

      const response = await fetch(`${apiUrl}/send?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Alfa SMS error: ${response.status} ${errorText}`);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json() as { id?: string; status?: string };

      if (result.status === 'error') {
        return { success: false, error: 'Alfa SMS returned error status' };
      }

      return { success: true, messageId: result.id };
    } catch (err) {
      this.logger.error(`Alfa SMS exception: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatus> {
    const apiUrl = this.configService.get<string>('app.sms.alfa.apiUrl');
    const login = this.configService.get<string>('app.sms.alfa.login');
    const password = this.configService.get<string>('app.sms.alfa.password');

    try {
      const params = new URLSearchParams({
        login: login ?? '',
        password: password ?? '',
        id: messageId,
      });

      const response = await fetch(`${apiUrl}/status?${params.toString()}`);
      if (!response.ok) return 'unknown';

      const result = await response.json() as { status?: string };
      const statusMap: Record<string, SmsDeliveryStatus> = {
        '1': 'delivered',
        '-1': 'failed',
        '0': 'pending',
      };

      return statusMap[result.status ?? ''] ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
