import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SmsGateway, SmsResult } from './providers/sms-gateway.interface';
import { maskPhone } from '@loyalty/shared-utils';
import { PrismaService } from '../../../prisma/prisma.service';

const SMS_TIMEOUT_MS = 5000;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject('BEELINE_SMS') private readonly beeline: SmsGateway,
    @Inject('ALFA_SMS') private readonly alfa: SmsGateway,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Sends OTP via primary SMS provider with automatic failover to secondary.
   */
  async sendOtp(phone: string, code: string): Promise<SmsResult> {
    const primaryName = this.configService.get<string>('app.sms.primaryProvider', 'beeline');
    const primary = primaryName === 'beeline' ? this.beeline : this.alfa;
    const fallback = primaryName === 'beeline' ? this.alfa : this.beeline;
    const fallbackName = primaryName === 'beeline' ? 'alfa' : 'beeline';

    try {
      const result = await Promise.race([
        primary.sendOtp(phone, code),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SMS timeout')), SMS_TIMEOUT_MS),
        ),
      ]);

      if (result.success) {
        this.logger.log('OTP sent successfully', {
          phone: maskPhone(phone),
          provider: primaryName,
          messageId: result.messageId,
        });
        await this.logSms(phone, primaryName, result.messageId ?? null, 'delivered', null);
        return result;
      }

      await this.logSms(phone, primaryName, null, 'failed', result.error ?? 'unknown');
      throw new Error(`Primary SMS provider returned failure: ${result.error ?? 'unknown'}`);
    } catch (err) {
      this.logger.warn(
        `Primary SMS provider (${primaryName}) failed: ${(err as Error).message}, trying fallback (${fallbackName})`,
        { phone: maskPhone(phone) },
      );

      const fallbackResult = await fallback.sendOtp(phone, code);

      if (fallbackResult.success) {
        this.logger.log('OTP sent via fallback provider', {
          phone: maskPhone(phone),
          provider: fallbackName,
          messageId: fallbackResult.messageId,
        });
        await this.logSms(phone, fallbackName, fallbackResult.messageId ?? null, 'delivered', null);
      } else {
        this.logger.error('Both SMS providers failed', {
          phone: maskPhone(phone),
          primaryError: (err as Error).message,
          fallbackError: fallbackResult.error,
        });
        await this.logSms(phone, fallbackName, null, 'failed', fallbackResult.error ?? 'unknown');
      }

      return fallbackResult;
    }
  }

  private async logSms(
    phone: string,
    provider: string,
    messageId: string | null,
    status: string,
    error: string | null,
  ): Promise<void> {
    try {
      await this.prisma.smsLog.create({
        data: { phone, provider, messageId, status, error },
      });
    } catch (err) {
      this.logger.warn(`Failed to log SMS entry: ${(err as Error).message}`);
    }
  }
}
