import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { XMLParser } from 'fast-xml-parser';

export interface LoyaltySystemGuestDto {
  balance: number;
  statusLevel: string;
  statusName: string;
  nextLevelPoints: number | null;
  guestName: string | null;
  birthDate: string | null;
  cardCode: string | null;
  bonusPercent: number | null;
}

interface LoyaltyXmlResponse {
  root: {
    result: {
      code: number | string;
      name?: string;
      summa?: number | string;
      name_level?: string;
      people?: string;
      birthday?: string;
      next_level_summa?: number | string;
      card_code?: string;
      bonus_percent?: number | string;
    };
  };
}

@Injectable()
export class LoyaltySystemClient {
  private readonly logger = new Logger(LoyaltySystemClient.name);
  private readonly parser = new XMLParser({
    ignoreAttributes: true,
    trimValues: true,
  });
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'app.loyaltySystem.apiUrl',
      'http://45.84.87.169:5100/api/xml/gate',
    );
  }

  /**
   * Fetches guest info from the loyalty system by phone number.
   */
  async getGuestInfo(phone: string): Promise<LoyaltySystemGuestDto> {
    const url = `${this.baseUrl}/Info?cell=${phone}`;

    this.logger.debug(`Fetching guest info: ${url.replace(phone, '***')}`);

    const response = await fetch(url, {
      headers: { 'Accept': 'application/xml' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Loyalty system HTTP ${response.status}`);
    }

    const xml = await response.text();
    const parsed = this.parser.parse(xml) as LoyaltyXmlResponse;
    const result = parsed?.root?.result;

    if (!result) {
      throw new Error('Invalid XML response from loyalty system');
    }

    const code = Number(result.code);
    if (code < 0) {
      throw new Error(`Loyalty system error: ${result.name ?? 'unknown'} (code ${code})`);
    }

    return {
      balance: Number(result.summa ?? 0),
      statusLevel: result.name_level ?? 'base',
      statusName: result.name_level ?? 'Базовый',
      nextLevelPoints: result.next_level_summa != null ? Number(result.next_level_summa) : null,
      guestName: result.people ?? null,
      birthDate: result.birthday ?? null,
      cardCode: result.card_code ?? null,
      bonusPercent: result.bonus_percent != null ? Number(result.bonus_percent) : null,
    };
  }
}
