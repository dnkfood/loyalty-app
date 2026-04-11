import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsGateway, SmsResult, SmsDeliveryStatus } from './sms-gateway.interface';

@Injectable()
export class BeelineSmsGateway implements SmsGateway {
  private readonly logger = new Logger(BeelineSmsGateway.name);
  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<SmsResult> {
    const apiUrl = this.configService.get<string>('app.sms.beeline.apiUrl');
    const login = this.configService.get<string>('app.sms.beeline.login');
    const password = this.configService.get<string>('app.sms.beeline.password');
    const sender = this.configService.get<string>('app.sms.beeline.sender') ?? 'DNKFOOD';
    const text = 'Kod: ' + code + '. Ne soobschayte nikomu.';
    const params = new URLSearchParams({
      user: login ?? '',
      pass: password ?? '',
      action: 'post_sms',
      target: phone,
      message: text,
      sender: sender,
      gzip: 'none',
    });
    try {
      const response = await fetch(apiUrl ?? 'https://a2p-sms-https.beeline.ru/proto/http/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });
      const resultText = await response.text();
      this.logger.log('Beeline response: ' + resultText);
      if (resultText.includes('<result') && !resultText.includes('<error')) {
        return { success: true };
      }
      this.logger.error('Beeline SMS failed: ' + resultText);
      return { success: false, error: resultText };
    } catch (err: unknown) {
      this.logger.error('Beeline SMS exception: ' + (err as Error).message);
      return { success: false, error: (err as Error).message };
    }
  }

  async getDeliveryStatus(_messageId: string): Promise<SmsDeliveryStatus> {
    return 'unknown';
  }
}
