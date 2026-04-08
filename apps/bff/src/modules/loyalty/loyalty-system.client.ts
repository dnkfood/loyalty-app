import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { XMLParser } from 'fast-xml-parser';
import { maskPhone } from '@loyalty/shared-utils';

// --- DTOs ---

export interface LoyaltyGuestInfoDto {
  balance: number;
  bonusPercent: number;
  maxPercent: number;
  cardCode: string;
  guestName: string | null;
  nextLevelSumma: number | null;
  statusLevel: string;
  cell: string;
  levels: LoyaltyLevelDto[];
}

export interface LoyaltyLevelDto {
  name: string;
  lowerBound: number;
  upperBound: number;
  bonusPercent: number;
}

export interface LoyaltySmsCodeDto {
  smsCode: string;
}

export interface LoyaltyApproveDto {
  approved: boolean;
}

export interface LoyaltyRegisterDto {
  registered: boolean;
  message: string;
}

export interface LoyaltyHistoryItemDto {
  date: string;
  summa: number;
  bonus: number;
  operation: string;
}

export interface LoyaltyHistoryDto {
  items: LoyaltyHistoryItemDto[];
}

// --- XML response shapes ---

interface XmlResult {
  code: number | string;
  name?: string;
  command?: string;
  summa?: number | string;
  bonus_percent?: number | string;
  max_percent?: number | string;
  card_code?: number | string;
  people?: string;
  birthday?: string;
  next_level_summa?: number | string;
  name_level?: string;
  cell?: string;
  sms_code?: number | string;
  levels?: XmlLevel | XmlLevel[];
}

interface XmlLevel {
  name: string;
  l_bnd: number | string;
  r_bnd: number | string;
  bonus_percent: number | string;
}

interface XmlRoot {
  root: {
    result: XmlResult | XmlResult[];
  };
}

@Injectable()
export class LoyaltySystemClient {
  private readonly logger = new Logger(LoyaltySystemClient.name);
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'app.loyaltySystem.apiUrl',
      'http://45.84.87.169:5100',
    );
  }

  /**
   * GET /api/xml/gate/Info?cell={phone}
   * Returns guest balance, status level, bonus percent, levels.
   */
  async getGuestInfo(phone: string): Promise<LoyaltyGuestInfoDto> {
    const result = await this.request(`/api/xml/gate/Info?cell=${phone}`);

    const levels = this.parseLevels(result.levels);

    return {
      balance: parseFloat(String(result.summa ?? '0')),
      bonusPercent: Number(result.bonus_percent ?? 0),
      maxPercent: Number(result.max_percent ?? 0),
      cardCode: String(result.card_code ?? ''),
      guestName: result.people?.trim() || null,
      nextLevelSumma: result.next_level_summa != null
        ? parseFloat(String(result.next_level_summa))
        : null,
      statusLevel: result.name_level ?? 'FRIEND',
      cell: String(result.cell ?? phone),
      levels,
    };
  }

  /**
   * GET /api/xml/gate/History?cell={phone}
   * Returns transaction history.
   */
  async getHistory(phone: string, from?: string, to?: string): Promise<LoyaltyHistoryDto> {
    let url = `/api/xml/gate/History?cell=${phone}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;

    const text = await this.rawRequest(url);

    // History may return multiple <result> nodes or an error
    try {
      const parsed = this.parseXml(text);
      const results = Array.isArray(parsed.root.result)
        ? parsed.root.result
        : [parsed.root.result];

      // First result with code=-1 means no history
      const first = results[0];
      if (first && Number(first.code) < 0) {
        return { items: [] };
      }

      const items: LoyaltyHistoryItemDto[] = results
        .filter((r) => r.summa !== undefined)
        .map((r) => ({
          date: String(r.name ?? ''),
          summa: parseFloat(String(r.summa ?? '0')),
          bonus: parseFloat(String(r.bonus_percent ?? '0')),
          operation: String(r.command ?? ''),
        }));

      return { items };
    } catch {
      return { items: [] };
    }
  }

  /**
   * GET /api/xml/gate/SmsCode?cell={phone}
   * Sends SMS code to the phone via the loyalty system.
   * Returns the code (for server-side verification tracking).
   */
  async sendSmsCode(phone: string): Promise<LoyaltySmsCodeDto> {
    const result = await this.request(`/api/xml/gate/SmsCode?cell=${phone}`);
    return {
      smsCode: String(result.sms_code ?? ''),
    };
  }

  /**
   * GET /api/xml/gate/Approve?cell={phone}&code={code}
   * Verifies the SMS code sent to the phone.
   */
  async approveCode(phone: string, code: string): Promise<LoyaltyApproveDto> {
    try {
      await this.request(`/api/xml/gate/Approve?cell=${phone}&code=${code}`);
      return { approved: true };
    } catch {
      return { approved: false };
    }
  }

  /**
   * GET /api/xml/gate/Register?cell={phone}&people={name}&birthday={birthday}
   * Registers a new guest in the loyalty system.
   */
  async registerGuest(
    phone: string,
    name: string,
    birthday?: string,
  ): Promise<LoyaltyRegisterDto> {
    let url = `/api/xml/gate/Register?cell=${phone}&people=${encodeURIComponent(name)}`;
    if (birthday) url += `&birthday=${birthday}`;

    const result = await this.request(url);
    return {
      registered: true,
      message: String(result.name ?? 'Registered'),
    };
  }

  /**
   * GET /api/xml/gate/QrCode?cell={phone}
   * Returns QR code data for the guest.
   */
  async getQrCode(phone: string): Promise<string> {
    try {
      const result = await this.request(`/api/xml/gate/QrCode?cell=${phone}`);
      return String(result.name ?? '');
    } catch (err) {
      this.logger.warn(`QrCode endpoint failed for ${maskPhone(phone)}: ${(err as Error).message}`);
      // QrCode endpoint may not be available — fall back to card_code
      const info = await this.getGuestInfo(phone);
      return info.cardCode;
    }
  }

  // --- Internal helpers ---

  private async request(path: string): Promise<XmlResult> {
    const text = await this.rawRequest(path);
    const parsed = this.parseXml(text);

    const result = Array.isArray(parsed.root.result)
      ? parsed.root.result[0]
      : parsed.root.result;

    if (!result) {
      throw new ServiceUnavailableException('Invalid response from loyalty system');
    }

    const code = Number(result.code);
    if (code < 0) {
      const msg = result.name ?? 'Unknown loyalty system error';
      if (msg.includes('не найден') || msg.includes('Не найден')) {
        throw new NotFoundException(`Loyalty: ${msg}`);
      }
      throw new ServiceUnavailableException(`Loyalty: ${msg} (code ${code})`);
    }

    return result;
  }

  private async rawRequest(path: string): Promise<string> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug(`Loyalty API: ${url.replace(/cell=\d+/, 'cell=***')}`);

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new ServiceUnavailableException(
        `Loyalty system unreachable: ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`Loyalty system HTTP ${response.status}`);
    }

    return response.text();
  }

  private parseXml(text: string): XmlRoot {
    // Response may be JSON (some endpoints) or XML
    if (text.trimStart().startsWith('{')) {
      const json = JSON.parse(text) as { root: XmlResult & { name?: string; code?: number } };
      return { root: { result: json.root as unknown as XmlResult } };
    }
    return this.parser.parse(text) as XmlRoot;
  }

  private parseLevels(raw: XmlLevel | XmlLevel[] | undefined): LoyaltyLevelDto[] {
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map((l) => ({
      name: l.name,
      lowerBound: parseFloat(String(l.l_bnd ?? '0')),
      upperBound: parseFloat(String(l.r_bnd ?? '0')),
      bonusPercent: Number(l.bonus_percent ?? 0),
    }));
  }
}
