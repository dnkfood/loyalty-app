import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltyCacheService } from './loyalty.cache.service';
import type { LoyaltyBalanceResponse, TransactionListResponse, LoyaltyCardResponse } from '@loyalty/shared-types';
import { ErrorCodes } from '@loyalty/shared-types';

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: LoyaltyCacheService,
  ) {}

  /**
   * Gets the loyalty balance for a user.
   */
  async getBalance(userId: string): Promise<LoyaltyBalanceResponse> {
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

    const cached = await this.cacheService.getBalance(user.externalGuestId);

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

    if (!user?.externalGuestId) {
      throw new NotFoundException({
        code: ErrorCodes.GUEST_NOT_FOUND,
        message: 'User not linked to loyalty system',
      });
    }

    // QR data contains the externalGuestId for the loyalty system to scan
    const qrData = JSON.stringify({
      type: 'loyalty_card',
      guestId: user.externalGuestId,
      ts: Date.now(),
    });

    return {
      qrData,
      externalGuestId: user.externalGuestId,
    };
  }
}
