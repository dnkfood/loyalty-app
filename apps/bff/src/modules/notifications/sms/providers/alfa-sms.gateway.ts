import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsGateway, SmsResult, SmsDeliveryStatus } from './sms-gateway.interface';

/**
 * AlfaSMS gateway (alfasms.info).
 *
 * Uses the legacy `method=push_msg` / `method=get_msg_report` HTTP API at
 * http://api.alfasms.info (plain HTTP). Requests are GET with query params;
 * responses are JSON wrapped in `{ response: { msg, data } }`.
 *
 * The gateway accepts any phone format and normalizes to the 11-digit
 * country-code form (`7XXXXXXXXXX`) that AlfaSMS expects.
 */

interface AlfaPushResponse {
  response?: {
    msg?: { err_code?: string; text?: string; type?: string };
    data?: { id?: string };
  };
}

// TODO(api-verify): get_msg_report response shape is assumed to mirror
// push_msg's wrapper. We don't have a confirmed sample. The `state` field
// is documented (0=sent, 1=delivered, 2/16/34=failed) but its location
// inside the envelope is a guess — adjust if real responses differ.
interface AlfaReportResponse {
  response?: {
    msg?: { err_code?: string; text?: string };
    data?: { state?: string | number };
  };
}

@Injectable()
export class AlfaSmsGateway implements SmsGateway {
  private readonly logger = new Logger(AlfaSmsGateway.name);

  constructor(private readonly configService: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<SmsResult> {
    const apiUrl = this.configService.get<string>('app.sms.alfa.apiUrl');
    const email = this.configService.get<string>('app.sms.alfa.login');
    const password = this.configService.get<string>('app.sms.alfa.password');

    if (!apiUrl || !email || !password) {
      return { success: false, error: 'AlfaSMS not configured' };
    }

    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      return { success: false, error: `Invalid phone format: ${phone}` };
    }

    try {
      const params = new URLSearchParams({
        method: 'push_msg',
        email,
        password,
        phone: normalizedPhone,
        message: `Ваш код: ${code}`,
        format: 'json',
        name: 'LoyaltyApp',
      });

      const response = await fetch(`${apiUrl}/?${params.toString()}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Alfa SMS HTTP ${response.status}: ${errorText}`);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const body = (await response.json()) as AlfaPushResponse;
      const msg = body.response?.msg;
      const data = body.response?.data;

      if (!msg || msg.err_code !== '0') {
        const errText = msg?.text ?? 'unknown';
        const errCode = msg?.err_code ?? '?';
        this.logger.error(`Alfa SMS rejected: err_code=${errCode} text=${errText}`);
        return { success: false, error: `Alfa SMS error ${errCode}: ${errText}` };
      }

      return { success: true, messageId: data?.id };
    } catch (err) {
      this.logger.error(`Alfa SMS exception: ${(err as Error).message}`);
      return { success: false, error: (err as Error).message };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<SmsDeliveryStatus> {
    const apiUrl = this.configService.get<string>('app.sms.alfa.apiUrl');
    const email = this.configService.get<string>('app.sms.alfa.login');
    const password = this.configService.get<string>('app.sms.alfa.password');

    if (!apiUrl || !email || !password) return 'unknown';

    try {
      const params = new URLSearchParams({
        method: 'get_msg_report',
        email,
        password,
        id: messageId,
        format: 'json',
      });

      const response = await fetch(`${apiUrl}/?${params.toString()}`, {
        method: 'GET',
      });
      if (!response.ok) return 'unknown';

      const body = (await response.json()) as AlfaReportResponse;
      const state = String(body.response?.data?.state ?? '');

      // 0=sent (in transit), 1=delivered, 2=not delivered,
      // 16=not delivered SMSC, 34=expired
      const stateMap: Record<string, SmsDeliveryStatus> = {
        '0': 'pending',
        '1': 'delivered',
        '2': 'failed',
        '16': 'failed',
        '34': 'failed',
      };

      return stateMap[state] ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Normalizes a phone number to the 11-digit `7XXXXXXXXXX` format that
   * AlfaSMS expects. Returns null if the input can't be normalized.
   *
   * Accepts: `+7 (911) 111-11-11`, `89111111111`, `79111111111`, `9111111111`.
   */
  private normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      if (digits.startsWith('7')) return digits;
      if (digits.startsWith('8')) return '7' + digits.slice(1);
    }
    if (digits.length === 10) return '7' + digits;
    return null;
  }
}
