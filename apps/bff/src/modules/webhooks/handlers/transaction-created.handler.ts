import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { LoyaltyWebhookPayload, TransactionCreatedData } from '@loyalty/shared-types';
import { LoyaltyCacheService } from '../../loyalty/loyalty.cache.service';
import { PushService } from '../../notifications/push/push.service';

@Injectable()
export class TransactionCreatedHandler {
  private readonly logger = new Logger(TransactionCreatedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: LoyaltyCacheService,
    private readonly pushService: PushService,
  ) {}

  /**
   * Handles transaction.created webhook event.
   * Saves transaction to log, invalidates cache, sends push notification.
   */
  async handle(payload: LoyaltyWebhookPayload): Promise<void> {
    const data = payload.data as unknown as TransactionCreatedData;
    const guestId = payload.guest_id;

    this.logger.log('Handling transaction.created event', {
      eventId: payload.event_id,
      guestId,
      transactionId: data.transaction_id,
      type: data.type,
      amount: data.amount,
    });

    // Save to transaction log (idempotency enforced by unique eventId)
    await this.prisma.transactionLog.create({
      data: {
        eventId: payload.event_id,
        externalGuestId: guestId,
        transactionId: data.transaction_id,
        type: data.type,
        amount: data.amount,
        newBalance: data.new_balance,
        description: data.description,
        occurredAt: new Date(payload.occurred_at),
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateCache(guestId);

    // Send push notification
    const user = await this.prisma.user.findFirst({
      where: { externalGuestId: guestId },
      select: { id: true },
    });

    if (user) {
      const templateKey = data.type === 'earn' ? 'TRANSACTION_EARN' : 'TRANSACTION_SPEND';
      await this.pushService.sendToUser({
        userId: user.id,
        templateKey,
        templateVars: {
          amount: Math.abs(data.amount).toString(),
          new_balance: data.new_balance.toString(),
        },
      });
    }

    this.logger.log(`Transaction ${data.transaction_id} processed for guest ${guestId}`);
  }
}
