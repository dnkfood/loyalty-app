import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { LoyaltyWebhookPayload, BalanceUpdatedData } from '@loyalty/shared-types';
import { LoyaltyCacheService } from '../../loyalty/loyalty.cache.service';

@Injectable()
export class BalanceUpdatedHandler {
  private readonly logger = new Logger(BalanceUpdatedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: LoyaltyCacheService,
  ) {}

  /**
   * Handles balance.updated webhook event.
   * Invalidates Redis cache so next request fetches fresh data.
   */
  async handle(payload: LoyaltyWebhookPayload): Promise<void> {
    const data = payload.data as unknown as BalanceUpdatedData;
    const guestId = payload.guest_id;

    this.logger.log('Handling balance.updated event', {
      eventId: payload.event_id,
      guestId,
      oldBalance: data.old_balance,
      newBalance: data.new_balance,
    });

    // Update PostgreSQL cache
    await this.prisma.loyaltyCache.updateMany({
      where: { externalGuestId: guestId },
      data: {
        balance: data.new_balance,
        cachedAt: new Date(),
      },
    });

    // Invalidate Redis cache to force fresh fetch on next request
    await this.cacheService.invalidateCache(guestId);

    this.logger.log(`Balance cache invalidated for guest ${guestId}`);
  }
}
