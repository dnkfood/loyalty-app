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
  summa: number;
  bonus: number;
  operation: string;
}

export interface LoyaltyHistoryDto {
  items: LoyaltyHistoryItemDto[];
}

// --- New JSON response shapes ---
// TODO(api-verify): These field names are assumed to mirror the legacy XML
// element names (snake_case). They have NOT been verified against a real
// response from the new HTTP+JSON loyalty API at http://45.84.87.169:5100.
// Test against the live API and adjust field names below if they differ.

interface LoyaltyErrorEnvelope {
  code?: number | string;
  name?: string;
}

interface InfoResponseJson extends LoyaltyErrorEnvelope {
  summa?: number | string;
  bonus_percent?: number | string;
  max_percent?: number | string;
  card_code?: number | string;
  people?: string;
  next_level_summa?: number | string;
  name_level?: string;
  cell?: string;
  levels?: LevelJson | LevelJson[];
}

interface LevelJson {
  name: string;
  l_bnd: number | string;
  r_bnd: number | string;
  bonus_percent: number | string;
}

interface CodeResponseJson extends LoyaltyErrorEnvelope {
  // Returned by the loyalty system but intentionally ignored by the BFF.
  // BFF generates and verifies its own OTP; this endpoint is called only
  // to trigger the loyalty system's outbound SMS gateway.
  sms_code?: string | number;
}

interface TransactionItemJson {
  name?: string; // date string
  summa?: number | string;
  bonus_percent?: number | string;
  command?: string;
}

interface TransactionResponseJson extends LoyaltyErrorEnvelope {
  // TODO(api-verify): unknown which of these shapes the new API uses.
  // The legacy XML returned multiple <result> nodes; the JSON port may
  // expose them as `results: [...]`, `result: [...]`, or a top-level array.
  results?: TransactionItemJson[];
  result?: TransactionItemJson | TransactionItemJson[];
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
   * POST /?query=info&phone={phone}
   * Returns guest balance, status level, bonus percent, levels.
   */
  async getGuestInfo(phone: string): Promise<LoyaltyGuestInfoDto> {
    const normalized = this.normalizePhone(phone);
    const data = await this.post<InfoResponseJson>('info', { phone: normalized });
    this.assertNoError(data);

    return {
      balance: parseFloat(String(data.summa ?? '0')),
      bonusPercent: Number(data.bonus_percent ?? 0),
      maxPercent: Number(data.max_percent ?? 0),
      cardCode: String(data.card_code ?? ''),
      guestName: data.people?.trim() || null,
      nextLevelSumma:
        data.next_level_summa != null
          ? parseFloat(String(data.next_level_summa))
          : null,
      statusLevel: data.name_level ?? 'FRIEND',
      cell: String(data.cell ?? normalized),
      levels: this.parseLevels(data.levels),
    };
  }

  /**
   * POST /?query=code&phone={phone}
   * Triggers the loyalty system to send an SMS code to the user's phone.
   *
   * NOTE: The loyalty system also returns the code in `sms_code` for
   * server-side use (e.g. cashier-side payment confirmation flows). The BFF
   * auth flow does NOT consume this value — it generates and verifies its
   * own OTP. This call exists purely as a side-effect trigger for the
   * outbound SMS via the loyalty system's gateway.
   */
  async sendSmsCode(phone: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    const data = await this.post<CodeResponseJson>('code', { phone: normalized });
    this.assertNoError(data);
  }

  /**
   * POST /?query=transaction&phone={phone}&begda={from}&enda={to}
   * Returns transaction history for the given phone within the date range.
   */
  async getHistory(
    phone: string,
    from?: string,
    to?: string,
  ): Promise<LoyaltyHistoryDto> {
    const normalized = this.normalizePhone(phone);
    const params: Record<string, string> = { phone: normalized };
    if (from) params.begda = from;
    if (to) params.enda = to;

    let data: TransactionResponseJson;
    try {
      data = await this.post<TransactionResponseJson>('transaction', params);
    } catch {
      return { items: [] };
    }

    // Negative code = no history (or upstream error). Return empty list.
    if (data.code != null && Number(data.code) < 0) {
      return { items: [] };
    }

    // TODO(api-verify): adjust this once we know the real response shape.
    const rawItems: TransactionItemJson[] = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.result)
        ? data.result
        : data.result
          ? [data.result]
          : [];

    const items: LoyaltyHistoryItemDto[] = rawItems
      .filter((r) => r.summa !== undefined)
      .map((r) => ({
        date: String(r.name ?? ''),
        summa: parseFloat(String(r.summa ?? '0')),
        bonus: parseFloat(String(r.bonus_percent ?? '0')),
        operation: String(r.command ?? ''),
      }));

    return { items };
  }

  // --- Internal helpers ---

  /**
   * Normalizes a phone number to the 10-digit format expected by the new
   * loyalty API. Strips non-digit characters and drops a leading 7 or 8
   * country/city prefix if present (Russian numbering).
   *
   * Examples:
   *   "+7 (911) 111-11-11" -> "9111111111"
   *   "89111111111"        -> "9111111111"
   *   "9111111111"         -> "9111111111"
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

  private async post<T>(
    query: string,
    params: Record<string, string>,
  ): Promise<T> {
    const qs = new URLSearchParams({ query, ...params }).toString();
    const url = `${this.baseUrl}/?${qs}`;
    this.logger.debug(
      `Loyalty API: POST ${url.replace(/phone=\d+/, `phone=${maskPhone(params.phone ?? '')}`)}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
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
        `Loyalty system returned non-JSON response`,
      );
    }
  }

  private assertNoError(data: LoyaltyErrorEnvelope): void {
    if (data.code == null) return;
    const code = Number(data.code);
    if (code < 0) {
      const msg = data.name ?? 'Unknown loyalty system error';
      if (msg.includes('не найден') || msg.includes('Не найден')) {
        throw new NotFoundException(`Loyalty: ${msg}`);
      }
      throw new ServiceUnavailableException(
        `Loyalty: ${msg} (code ${code})`,
      );
    }
  }

  private parseLevels(
    raw: LevelJson | LevelJson[] | undefined,
  ): LoyaltyLevelDto[] {
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
