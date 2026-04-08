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
      select: { phone: true, externalGuestId: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: ErrorCodes.GUEST_NOT_FOUND,
        message: 'User not found',
      });
    }

    // Use phone as loyalty system identifier (XML API uses cell=phone)
    const lookupId = user.phone;
    const cached = await this.cacheService.getBalance(lookupId);

    return {
      balance: cached.balance,
      statusLevel: cached.statusLevel,
      statusName: cached.statusName,
      nextLevelPoints: cached.nextLevelPoints,
      isCached: cached.isCached,
      cachedAt: cached.cachedAt,
    };
  }

  /**
   * Gets paginated transaction history for a user.
   */
  async getTransactions(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<TransactionListResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { externalGuestId: true },
    });

    if (!user?.externalGuestId) {
      throw new NotFoundException({
        code: ErrorCodes.GUEST_NOT_FOUND,
        message: 'User not linked to loyalty system',
      });
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.transactionLog.findMany({
        where: { externalGuestId: user.externalGuestId },
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transactionLog.count({
        where: { externalGuestId: user.externalGuestId },
      }),
    ]);

    return {
      items: items.map((t) => ({
        id: t.id,
        type: t.type as 'earn' | 'spend' | 'expire' | 'correction',
        amount: t.amount,
        newBalance: t.newBalance,
        description: t.description,
        occurredAt: t.occurredAt,
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
