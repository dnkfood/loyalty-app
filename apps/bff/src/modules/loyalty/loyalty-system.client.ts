import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { maskPhone } from '@loyalty/shared-utils';

// --- DTOs ---

export interface LoyaltyGuestInfoDto {
  balance: number;
  bonusPercent: number;
  maxPercent: number;
  cardCode: string;
  guestName: string | null;
  nextLevelSumma: number | null;
  currentSpend: number | null;
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

export interface LoyaltyHistoryItemDto {
  date: string;
  amount: number;
  description: string;
  transactionType: string;
  sign: number;
}

export interface LoyaltyHistoryDto {
  items: LoyaltyHistoryItemDto[];
}

// --- Raw JSON response shapes from /api/Gate/* ---
// All responses are wrapped in { root: { result: ... } }

interface GateEnvelope<T> {
  root: {
    result: T;
  };
}

interface InfoResult {
  name?: string;
  command?: string;
  code?: string;
  summa?: string;
  bonus_percent?: string;
  max_percent?: string;
  card_code?: string;
  people?: string;
  birthday?: string;
  e_mail?: string;
  region_id?: string;
  next_level_summa?: string;
  name_level?: string;
  cell?: string;
  summa_a?: string;
  levels?: LevelResult[];
}

interface LevelResult {
  name: string;
  l_bnd: string;
  r_bnd: string;
  bonus_percent: string;
}

interface SmsCodeResult {
  code?: string;
  sms_code?: string;
  command?: string;
}

interface QrCodeResult {
  code?: string;
  command?: string;
  qr_code?: string;
}

interface HistoryResult {
  command?: string;
  date_op?: string;
  summa?: string;
  name_transaction?: string;
  id_transaction_type?: string;
  sign?: string;
}

@Injectable()
export class LoyaltySystemClient {
  private readonly logger = new Logger(LoyaltySystemClient.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'app.loyaltySystem.apiUrl',
      'http://45.84.87.169:5100',
    );
  }

  /**
   * GET /api/Gate/Info?cell={cell}
   * Returns guest balance, status level, bonus percent, levels.
   */
  async getGuestInfo(phone: string): Promise<LoyaltyGuestInfoDto> {
    const cell = this.normalizePhone(phone);
    const data = await this.get<GateEnvelope<InfoResult>>('Info', { cell });
    const r = data.root.result;
    this.assertCode(r.code);

    return {
      balance: parseFloat(r.summa ?? '0'),
      bonusPercent: Number(r.bonus_percent ?? 0),
      maxPercent: Number(r.max_percent ?? 0),
      cardCode: r.card_code ?? '',
      guestName: r.people?.trim() || null,
      nextLevelSumma:
        r.next_level_summa != null ? parseFloat(r.next_level_summa) : null,
      currentSpend: r.summa_a != null ? parseFloat(r.summa_a) : null,
      statusLevel: r.name_level ?? 'FRIEND',
      cell: r.cell ?? cell,
      levels: this.parseLevels(r.levels),
    };
  }

  /**
   * GET /api/Gate/SmsCode?cell={cell}
   * Triggers the loyalty system to send an SMS code to the user's phone.
   */
  async sendSmsCode(phone: string): Promise<void> {
    const cell = this.normalizePhone(phone);
    const data = await this.get<GateEnvelope<SmsCodeResult>>('SmsCode', { cell });
    this.assertCode(data.root.result.code);
  }

  /**
   * GET /api/Gate/SmsCode?cell={cell}
   * Returns the dynamic sms_code for QR display (same endpoint as sendSmsCode
   * but we extract the code from the response).
   */
  async getCardCode(phone: string): Promise<string> {
    const cell = this.normalizePhone(phone);
    const data = await this.get<GateEnvelope<SmsCodeResult>>('SmsCode', { cell });
    this.assertCode(data.root.result.code);
    return data.root.result.sms_code ?? '';
  }

  /**
   * GET /api/Gate/QrCode?cell={cell}
   * Returns QR code data for the guest.
   */
  async getQrCode(phone: string): Promise<string | null> {
    const cell = this.normalizePhone(phone);
    const data = await this.get<GateEnvelope<QrCodeResult>>('QrCode', { cell });
    this.assertCode(data.root.result.code);
    return data.root.result.qr_code ?? null;
  }

  /**
   * GET /api/Gate/History?cell={cell}&beginDate={from}&endDate={to}
   * Returns transaction history for the given phone within the date range.
   * The result can be a single object or an array of objects.
   */
  async getHistory(
    phone: string,
    from?: string,
    to?: string,
  ): Promise<LoyaltyHistoryDto> {
    const cell = this.normalizePhone(phone);
    const params: Record<string, string> = { cell };
    if (from) params.beginDate = from;
    if (to) params.endDate = to;

    let data: GateEnvelope<HistoryResult | HistoryResult[]>;
    try {
      data = await this.get('History', params);
    } catch {
      return { items: [] };
    }

    const raw = data.root.result;
    const rawItems: HistoryResult[] = Array.isArray(raw) ? raw : [raw];

    const items: LoyaltyHistoryItemDto[] = rawItems
      .filter((r) => r.summa !== undefined)
      .map((r) => ({
        date: r.date_op ?? '',
        amount: parseFloat(r.summa ?? '0'),
        description: r.name_transaction ?? '',
        transactionType: r.id_transaction_type ?? '',
        sign: parseInt(r.sign ?? '1', 10),
      }));

    return { items };
  }

  // --- Internal helpers ---

  /**
   * Normalizes a phone number to the 10-digit format expected by the
   * loyalty API (the `cell` parameter). Strips non-digit characters and
   * drops a leading 7 or 8 country prefix if present.
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    let result = digits;
    if (
      digits.length === 11 &&
      (digits.startsWith('7') || digits.startsWith('8'))
    ) {
      result = digits.slice(1);
    }
    if (result.length !== 10) {
      throw new BadRequestException(
        `Invalid phone format: expected 10 digits after normalization, got ${result.length}`,
      );
    }
    return result;
  }

  /**
   * Makes a GET request to /api/Gate/{command}?{params}
   */
  private async get<T>(
    command: string,
    params: Record<string, string>,
  ): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}/api/Gate/${command}?${qs}`;
    this.logger.debug(
      `Loyalty API: GET ${url.replace(/cell=\d+/, `cell=${maskPhone(params.cell ?? '')}`)}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      throw new ServiceUnavailableException(
        `Loyalty system unreachable: ${(err as Error).message}`,
      );
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Loyalty system HTTP ${response.status}`,
      );
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ServiceUnavailableException(
        'Loyalty system returned non-JSON response',
      );
    }
  }

  /**
   * Checks the `code` field from the loyalty response.
   * Code "0" = success, negative = error.
   */
  private assertCode(code: string | undefined): void {
    if (code == null) return;
    const num = Number(code);
    if (num < 0) {
      throw new NotFoundException(`Loyalty error (code ${code})`);
    }
  }

  private parseLevels(raw: LevelResult[] | undefined): LoyaltyLevelDto[] {
    if (!raw) return [];
    return raw.map((l) => ({
      name: l.name,
      lowerBound: parseFloat(l.l_bnd ?? '0'),
      upperBound: parseFloat(l.r_bnd ?? '0'),
      bonusPercent: Number(l.bonus_percent ?? 0),
    }));
  }
}
