import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { LoyaltyCacheService } from './loyalty.cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { Redis } from 'ioredis';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('LoyaltyCacheService', () => {
  let service: LoyaltyCacheService;
  let prisma: DeepMockProxy<PrismaService>;
  let redis: DeepMockProxy<Redis>;
  let configService: DeepMockProxy<ConfigService>;

  const guestId = 'guest-123';
  const cachedData = {
    userId: guestId,
    externalGuestId: 'ext-123',
    balance: 500,
    statusLevel: 'gold',
    statusName: 'Gold',
    nextLevelPoints: 1000,
    segmentIds: ['vip'],
    isCached: true,
    cachedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    redis = mockDeep<Redis>();
    configService = mockDeep<ConfigService>();
    mockFetch.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        LoyaltyCacheService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'REDIS_CLIENT', useValue: redis },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(LoyaltyCacheService);
  });

  describe('getBalance', () => {
    it('should return cached data on Redis cache hit', async () => {
      redis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getBalance(guestId);

      expect(result.isCached).toBe(true);
      expect(result.balance).toBe(500);
      expect(result.statusName).toBe('Gold');
      expect(redis.get).toHaveBeenCalledWith(`loyalty:${guestId}`);
      // Should NOT call fetch or prisma
      expect(mockFetch).not.toHaveBeenCalled();
      expect(prisma.loyaltyCache.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from loyalty system on cache miss and store in Redis + PG', async () => {
      redis.get.mockResolvedValue(null);
      const apiData = { ...cachedData, isCached: false };
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(apiData),
      });
      redis.setex.mockResolvedValue('OK');
      prisma.loyaltyCache.upsert.mockResolvedValue({} as any);
      configService.get.mockReturnValue('http://loyalty.test');

      const result = await service.getBalance(guestId);

      expect(result.isCached).toBe(false);
      expect(result.balance).toBe(500);
      // Redis cache set
      expect(redis.setex).toHaveBeenCalledWith(
        `loyalty:${guestId}`,
        300,
        expect.any(String),
      );
      // PG cache updated
      expect(prisma.loyaltyCache.upsert).toHaveBeenCalled();
    });

    it('should fall back to PostgreSQL when loyalty system is unavailable', async () => {
      redis.get.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Connection refused'));
      configService.get.mockReturnValue('http://loyalty.test');
      prisma.loyaltyCache.findUnique.mockResolvedValue({
        userId: guestId,
        externalGuestId: 'ext-123',
        balance: 400,
        statusLevel: 'silver',
        statusName: 'Silver',
        nextLevelPoints: 500,
        segmentIds: [],
        isCached: true,
        cachedAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getBalance(guestId);

      expect(result.isCached).toBe(true);
      expect(result.balance).toBe(400);
      expect(result.statusName).toBe('Silver');
      expect(prisma.loyaltyCache.findUnique).toHaveBeenCalledWith({
        where: { userId: guestId },
      });
    });

    it('should throw ServiceUnavailableException when all sources fail', async () => {
      redis.get.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error('Connection refused'));
      configService.get.mockReturnValue('http://loyalty.test');
      prisma.loyaltyCache.findUnique.mockResolvedValue(null);

      await expect(service.getBalance(guestId))
        .rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('invalidateCache', () => {
    it('should delete Redis cache key', async () => {
      redis.del.mockResolvedValue(1);

      await service.invalidateCache(guestId);

      expect(redis.del).toHaveBeenCalledWith(`loyalty:${guestId}`);
    });
  });
});
