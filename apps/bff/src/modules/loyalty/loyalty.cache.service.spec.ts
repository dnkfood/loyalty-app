import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { LoyaltyCacheService } from './loyalty.cache.service';
import { LoyaltySystemClient } from './loyalty-system.client';
import { PrismaService } from '../../prisma/prisma.service';
import type { Redis } from 'ioredis';

describe('LoyaltyCacheService', () => {
  let service: LoyaltyCacheService;
  let prisma: DeepMockProxy<PrismaService>;
  let redis: DeepMockProxy<Redis>;
  let loyaltyClient: DeepMockProxy<LoyaltySystemClient>;

  const phone = '79991234567';
  const cachedData = {
    userId: phone,
    externalGuestId: '810885688',
    balance: 500,
    statusLevel: 'FRIEND',
    statusName: 'FRIEND',
    nextLevelPoints: 25000,
    segmentIds: [] as string[],
    isCached: true,
    cachedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    redis = mockDeep<Redis>();
    loyaltyClient = mockDeep<LoyaltySystemClient>();

    const module = await Test.createTestingModule({
      providers: [
        LoyaltyCacheService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'REDIS_CLIENT', useValue: redis },
        { provide: LoyaltySystemClient, useValue: loyaltyClient },
      ],
    }).compile();

    service = module.get(LoyaltyCacheService);
  });

  describe('getBalance', () => {
    it('should return cached data on Redis cache hit', async () => {
      redis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getBalance(phone);

      expect(result.isCached).toBe(true);
      expect(result.balance).toBe(500);
      expect(result.statusLevel).toBe('FRIEND');
      expect(redis.get).toHaveBeenCalledWith(`loyalty:${phone}`);
      expect(loyaltyClient.getGuestInfo).not.toHaveBeenCalled();
    });

    it('should fetch from loyalty system on cache miss and store in Redis + PG', async () => {
      redis.get.mockResolvedValue(null);
      loyaltyClient.getGuestInfo.mockResolvedValue({
        balance: 200, bonusPercent: 5, maxPercent: 30,
        cardCode: '810885688', guestName: 'Test', nextLevelSumma: 24999.99,
        statusLevel: 'FRIEND', cell: phone, levels: [],
      });
      redis.setex.mockResolvedValue('OK');
      prisma.loyaltyCache.upsert.mockResolvedValue({} as any);

      const result = await service.getBalance(phone);

      expect(result.isCached).toBe(false);
      expect(result.balance).toBe(200);
      expect(result.externalGuestId).toBe('810885688');
      expect(redis.setex).toHaveBeenCalledWith(`loyalty:${phone}`, 300, expect.any(String));
      expect(prisma.loyaltyCache.upsert).toHaveBeenCalled();
    });

    it('should fall back to PostgreSQL when loyalty system is unavailable', async () => {
      redis.get.mockResolvedValue(null);
      loyaltyClient.getGuestInfo.mockRejectedValue(new Error('Connection refused'));
      prisma.loyaltyCache.findUnique.mockResolvedValue({
        userId: phone,
        externalGuestId: '810885688',
        balance: 400,
        statusLevel: 'FRIEND',
        statusName: 'FRIEND',
        nextLevelPoints: 25000,
        segmentIds: [],
        isCached: true,
        cachedAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getBalance(phone);

      expect(result.isCached).toBe(true);
      expect(result.balance).toBe(400);
    });

    it('should throw ServiceUnavailableException when all sources fail', async () => {
      redis.get.mockResolvedValue(null);
      loyaltyClient.getGuestInfo.mockRejectedValue(new Error('Connection refused'));
      prisma.loyaltyCache.findUnique.mockResolvedValue(null);

      await expect(service.getBalance(phone))
        .rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('invalidateCache', () => {
    it('should delete Redis cache key', async () => {
      redis.del.mockResolvedValue(1);

      await service.invalidateCache(phone);

      expect(redis.del).toHaveBeenCalledWith(`loyalty:${phone}`);
    });
  });
});
