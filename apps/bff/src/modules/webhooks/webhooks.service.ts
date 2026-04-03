import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import type { LoyaltyWebhookPayload } from '@loyalty/shared-types';

export const WEBHOOK_QUEUE_NAME = 'webhook-events';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly webhookQueue: Queue<LoyaltyWebhookPayload>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    const [host, portStr] = redisUrl.replace('redis://', '').split(':');
    const port = portStr ? parseInt(portStr, 10) : 6379;

    this.webhookQueue = new Queue<LoyaltyWebhookPayload>(WEBHOOK_QUEUE_NAME, {
      connection: { host: host ?? 'localhost', port },
    });
  }

  /**
   * Processes incoming webhook event with idempotency check.
   */
  async processEvent(payload: LoyaltyWebhookPayload): Promise<void> {
    this.logger.log(`Processing webhook event`, {
      eventId: payload.event_id,
      eventType: payload.event_type,
      guestId: payload.guest_id,
    });

    // 1. Check idempotency — if event_id already processed, skip
    const existing = await this.prisma.transactionLog.findUnique({
      where: { eventId: payload.event_id },
    });

    if (existing) {
      this.logger.debug(`Event ${payload.event_id} already processed, skipping`);
      return;
    }

    // 2. Enqueue for async processing with retry
    await this.webhookQueue.add(payload.event_type, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    });

    this.logger.log(`Event ${payload.event_id} enqueued for processing`);
  }
}
