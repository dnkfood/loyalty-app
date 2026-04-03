import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { Redis } from 'ioredis';
import type { LoyaltyCache } from '@loyalty/shared-types';

const CACHE_TTL = 300; // 5 minutes
const CACHE_KEY = (guestId: string) => `loyalty:${guestId}`;

export type LoyaltyCacheDto = LoyaltyCache & { isCached: boolean };

@Injectable()
export class LoyaltyCacheService {
  private readonly logger = new Logger(LoyaltyCacheService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Retrieves loyalty data using cache-first strategy.
   * 1. Try Redis cache
   * 2. On miss — fetch from loyalty system
   * 3. On system unavailable — fall back to PostgreSQL loyalty_cache
   */
  async getBalance(guestId: string): Promise<LoyaltyCacheDto> {
    const cached = await this.redis.get(CACHE_KEY(guestId));
    if (cached) {
      this.logger.debug(`Cache hit for guest ${guestId}`);
      return { ...(JSON.parse(cached) as LoyaltyCacheDto), isCached: true };
    }

    // Cache miss — fetch from loyalty system
    try {
      const data = await this.fetchFromLoyaltySystem(guestId);
      await this.redis.setex(CACHE_KEY(guestId), CACHE_TTL, JSON.stringify(data));

      // Also update PostgreSQL cache
      await this.upsertDbCache(guestId, data);

      return { ...data, isCached: false };
    } catch (err) {
      this.logger.warn(
        `Loyalty system unavailable for guest ${guestId}, falling back to DB cache: ${(err as Error).message}`,
      );

      // Fallback: return from PostgreSQL loyalty_cache
      const dbCache = await this.prisma.loyaltyCache.findUnique({
        where: { userId: guestId },
      });

      if (dbCache) {
        return {
          userId: dbCache.userId,
          externalGuestId: dbCache.externalGuestId,
          balance: dbCache.balance,
          statusLevel: dbCache.statusLevel,
          statusName: dbCache.statusName,
          nextLevelPoints: dbCache.nextLevelPoints,
          segmentIds: dbCache.segmentIds,
          isCached: true,
          cachedAt: dbCache.cachedAt,
          updatedAt: dbCache.updatedAt,
        };
      }

      throw new ServiceUnavailableException('Loyalty system unavailable');
    }
  }

  /**
   * Invalidates Redis cache for a guest (called on webhook events).
   */
  async invalidateCache(guestId: string): Promise<void> {
    await this.redis.del(CACHE_KEY(guestId));
    this.logger.log(`Cache invalidated for guest ${guestId}`);
  }

  private async fetchFromLoyaltySystem(guestId: string): Promise<LoyaltyCacheDto> {
    const loyaltyApiUrl = this.configService.get<string>('app.loyaltySystem.apiUrl');
    const loyaltyApiKey = this.configService.get<string>('app.loyaltySystem.apiKey');

    // TODO: Use actual HTTP client (Axios) for real loyalty system
    const response = await fetch(`${loyaltyApiUrl}/guests/${guestId}`, {
      headers: {
        Authorization: `Bearer ${loyaltyApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Loyalty system responded with ${response.status}`);
    }

    return response.json() as Promise<LoyaltyCacheDto>;
  }

  private async upsertDbCache(guestId: string, data: LoyaltyCacheDto): Promise<void> {
    await this.prisma.loyaltyCache.upsert({
      where: { userId: guestId },
      update: {
        balance: data.balance,
        statusLevel: data.statusLevel,
        statusName: data.statusName,
        nextLevelPoints: data.nextLevelPoints,
        segmentIds: data.segmentIds,
        cachedAt: new Date(),
      },
      create: {
        userId: guestId,
        externalGuestId: data.externalGuestId,
        balance: data.balance,
        statusLevel: data.statusLevel,
        statusName: data.statusName,
        nextLevelPoints: data.nextLevelPoints,
        segmentIds: data.segmentIds,
        cachedAt: new Date(),
      },
    });
  }
}
