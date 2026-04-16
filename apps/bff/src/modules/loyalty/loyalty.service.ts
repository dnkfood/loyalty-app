import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltyCacheService } from './loyalty.cache.service';
import { LoyaltySystemClient } from './loyalty-system.client';
import type { LoyaltyBalanceResponse, TransactionListResponse, LoyaltyCardResponse } from '@loyalty/shared-types';
import { ErrorCodes } from '@loyalty/shared-types';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: LoyaltyCacheService,
    private readonly loyaltyClient: LoyaltySystemClient,
  ) {}

  /**
   * Gets the loyalty balance for a user.
   */
  async getBalance(userId: string): Promise<LoyaltyBalanceResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, externalGuestId: true, name: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.GUEST_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Phone is the loyalty system's lookup key (was `cell=` in the legacy XML).
    const lookupId = user.phone;
    const cached = await this.cacheService.getBalance(lookupId);

    return {
      balance: cached.balance,
      statusLevel: cached.statusLevel,
      statusName: cached.statusName,
      nextLevelPoints: cached.nextLevelPoints,
      bonusPercent: cached.bonusPercent,
      cardCode: cached.externalGuestId,
      // Prefer the user's stored name; fall back to whatever loyalty had.
      guestName: user.name ?? cached.guestName,
      // If the loyalty system didn't expose `summa_a`, use `balance` as a
      // proxy so the progress bar still has something to render.
      currentSpend: cached.currentSpend ?? cached.balance,
      isCached: cached.isCached,
      cachedAt: cached.cachedAt,
    };
  }

  /**
   * Gets paginated transaction history for a user from the loyalty API.
   */
  async getTransactions(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<TransactionListResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, externalGuestId: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.GUEST_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Fetch last 2 years of history from the loyalty system
    const now = new Date();
    const twoYearsAgo = new Date(now);
    twoYearsAgo.setFullYear(now.getFullYear() - 2);
    const fromDate = twoYearsAgo.toISOString().split('T')[0];
    const toDate = now.toISOString().split('T')[0];

    const history = await this.loyaltyClient.getHistory(user.phone, fromDate, toDate);

    // Sort by date descending
    const sorted = history.items.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const total = sorted.length;
    const skip = (page - 1) * limit;
    const pageItems = sorted.slice(skip, skip + limit);

    return {
      items: pageItems.map((t, idx) => ({
        id: `tx-${skip + idx}`,
        type: t.sign >= 0 ? ('earn' as const) : ('spend' as const),
        amount: Math.abs(t.amount),
        newBalance: 0,
        description: t.description || null,
        occurredAt: new Date(t.date),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Gets QR card data for a user.
   */
  async getCard(userId: string): Promise<LoyaltyCardResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { externalGuestId: true, phone: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.GUEST_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Get card code from loyalty system (used for QR scanning at POS)
    let cardCode = user.externalGuestId ?? '';
    try {
      const info = await this.loyaltyClient.getGuestInfo(user.phone);
      cardCode = info.cardCode || cardCode;
    } catch {
      // Use cached externalGuestId if loyalty system is down
    }

    const qrData = JSON.stringify({
      type: 'loyalty_card',
      cardCode,
      ts: Date.now(),
    });

    return {
      qrData,
      externalGuestId: cardCode,
    };
  }
}
