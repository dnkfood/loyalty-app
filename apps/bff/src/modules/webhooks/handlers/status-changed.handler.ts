import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import type { LoyaltyWebhookPayload, StatusChangedData } from '@loyalty/shared-types';
import { LoyaltyCacheService } from '../../loyalty/loyalty.cache.service';
import { PushService } from '../../notifications/push/push.service';

@Injectable()
export class StatusChangedHandler {
  private readonly logger = new Logger(StatusChangedHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: LoyaltyCacheService,
    private readonly pushService: PushService,
  ) {}

  /**
   * Handles status.changed webhook event.
   * Updates loyalty cache and sends congratulation push notification.
   */
  async handle(payload: LoyaltyWebhookPayload): Promise<void> {
    const data = payload.data as unknown as StatusChangedData;
    const guestId = payload.guest_id;

    this.logger.log('Handling status.changed event', {
      eventId: payload.event_id,
      guestId,
      oldStatus: data.old_status,
      newStatus: data.new_status,
      statusName: data.status_name,
    });

    // Update PostgreSQL loyalty cache
    await this.prisma.loyaltyCache.updateMany({
      where: { externalGuestId: guestId },
      data: {
        statusLevel: data.new_status,
        statusName: data.status_name,
        nextLevelPoints: data.next_level_points ?? null,
        cachedAt: new Date(),
      },
    });

    // Invalidate Redis cache
    await this.cacheService.invalidateCache(guestId);

    // Send congratulation push notification for status upgrades
    const user = await this.prisma.user.findFirst({
      where: { externalGuestId: guestId },
      select: { id: true },
    });

    if (user) {
      await this.pushService.sendToUser({
        userId: user.id,
        templateKey: 'STATUS_UPGRADED',
        templateVars: {
          status_name: data.status_name,
        },
      });
    }

    this.logger.log(`Status updated to ${data.new_status} (${data.status_name}) for guest ${guestId}`);
  }
}
