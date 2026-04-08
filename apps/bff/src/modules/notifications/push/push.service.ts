import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Redis } from 'ioredis';
import { renderPushTemplate, type PushTemplateKey } from './templates';

export interface SendPushOptions {
  userId: string;
  templateKey: PushTemplateKey;
  templateVars: Record<string, string>;
  data?: Record<string, string>;
  campaignId?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Checks if user can receive a push notification (frequency capping).
   */
  async canSendPush(userId: string): Promise<boolean> {
    const key = `push:freq:${userId}:${new Date().toISOString().split('T')[0]}`;
    const count = await this.redis.get(key);
    const max = this.configService.get<number>('app.push.maxPerUserPerDay', 3);
    return !count || parseInt(count, 10) < max;
  }

  /**
   * Increments the push send counter for frequency capping.
   */
  async incrementPushCount(userId: string): Promise<void> {
    const key = `push:freq:${userId}:${new Date().toISOString().split('T')[0]}`;
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 86400); // 24 hours TTL
    await pipeline.exec();
  }

  /**
   * Sends push notification to all active devices of a user.
   */
  async sendToUser(options: SendPushOptions): Promise<void> {
    const { userId, templateKey, templateVars, data, campaignId } = options;

    if (!(await this.canSendPush(userId))) {
      this.logger.warn(`Push frequency cap reached for user ${userId}`);
      return;
    }

    const tokens = await this.prisma.pushToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokens.length === 0) {
      this.logger.debug(`No active push tokens for user ${userId}`);
      return;
    }

    const notification = renderPushTemplate(templateKey, templateVars);

    for (const token of tokens) {
      try {
        // TODO: Call FCM/APNs service
        await this.sendToDevice(token.token, token.platform, notification, data);

        await this.prisma.pushNotificationLog.create({
          data: {
            campaignId,
            userId,
            token: token.token,
            status: 'sent',
          },
        });

        await this.incrementPushCount(userId);
      } catch (err) {
        this.logger.error(`Failed to send push to token ${token.id}: ${(err as Error).message}`);

        await this.prisma.pushNotificationLog.create({
          data: {
            campaignId,
            userId,
            token: token.token,
            status: 'failed',
            errorCode: (err as Error).message,
          },
        });
      }
    }
  }

  /**
   * Sends a raw push notification (no template) to all active devices of a user.
   * Used for campaign pushes where title/body come directly from the campaign.
   */
  async sendRawToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    campaignId?: string,
  ): Promise<void> {
    if (!(await this.canSendPush(userId))) {
      this.logger.warn(`Push frequency cap reached for user ${userId}`);
      return;
    }
    const tokens = await this.prisma.pushToken.findMany({ where: { userId, isActive: true } });
    if (tokens.length === 0) return;

    for (const token of tokens) {
      try {
        await this.sendToDevice(token.token, token.platform, { title, body }, data);
        await this.prisma.pushNotificationLog.create({
          data: { campaignId, userId, token: token.token, status: 'sent' },
        });
        await this.incrementPushCount(userId);
      } catch (err) {
        await this.prisma.pushNotificationLog.create({
          data: { campaignId, userId, token: token.token, status: 'failed', errorCode: (err as Error).message },
        });
      }
    }
  }

  private async sendToDevice(
    token: string,
    platform: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<void> {
    if (platform === 'android') {
      await this.sendFcm(token, notification, data);
    } else if (platform === 'ios') {
      await this.sendApns(token, notification, data);
    } else {
      this.logger.warn(`Unknown platform: ${platform}`);
    }
  }

  private async sendFcm(
    token: string,
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<void> {
    const serverKey = this.configService.get<string>('app.push.fcm.serverKey', '');
    if (!serverKey) {
      this.logger.warn('FCM_SERVER_KEY not configured, skipping push send');
      return;
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: { title: notification.title, body: notification.body },
        data: data ?? {},
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FCM error ${response.status}: ${text}`);
    }
  }

  private async sendApns(
    _token: string,
    _notification: { title: string; body: string },
    _data?: Record<string, string>,
  ): Promise<void> {
    const bundleId = this.configService.get<string>('app.push.apns.bundleId', '');
    const keyId = this.configService.get<string>('app.push.apns.keyId', '');
    if (!bundleId || !keyId) {
      this.logger.warn('APNs not configured, skipping push send');
      return;
    }

    // APNs HTTP/2 implementation requires p8 key file and JWT signing
    // For now, log and skip if key file doesn't exist
    this.logger.warn('APNs HTTP/2 sending not yet fully implemented, skipping');
  }
}
