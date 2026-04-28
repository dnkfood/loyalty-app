import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { LoyaltyCacheService } from '../loyalty/loyalty.cache.service';
import type { LoyaltyWebhookPayload } from '@loyalty/shared-types';

export const WEBHOOK_QUEUE_NAME = 'webhook-events';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly webhookQueue: Queue<LoyaltyWebhookPayload>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly loyaltyCache: LoyaltyCacheService,
  ) {
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    const [host, portStr] = redisUrl.replace('redis://', '').split(':');
    const port = portStr ? parseInt(portStr, 10) : 6379;

    this.webhookQueue = new Queue<LoyaltyWebhookPayload>(WEBHOOK_QUEUE_NAME, {
      connection: { host: host ?? 'localhost', port },
    });
  }

  /**
   * Loyalty notified us that a guest's balance changed — drop Redis cache so
   * the next mobile request refetches fresh data from the loyalty API.
   * `cell` is a 10-digit phone (no country code), which is also the cache key
   * (LoyaltyCacheService keys by phone).
   */
  async handleBalanceChanged(cell: string): Promise<void> {
    await this.loyaltyCache.invalidateCache(cell);
  }

  /**
   * @deprecated Old POST+HMAC path. Kept for spec compatibility while we
   * migrate to the GET+atoken contract used by the Loyalty system.
   */
  async processEvent(payload: LoyaltyWebhookPayload): Promise<void> {
    this.logger.log(`Processing webhook event`, {
      eventId: payload.event_id,
      eventType: payload.event_type,
      guestId: payload.guest_id,
    });

    const existing = await this.prisma.transactionLog.findUnique({
      where: { eventId: payload.event_id },
    });

    if (existing) {
      this.logger.debug(`Event ${payload.event_id} already processed, skipping`);
      return;
    }

    await this.webhookQueue.add(payload.event_type, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });

    this.logger.log(`Event ${payload.event_id} enqueued for processing`);
  }
}
