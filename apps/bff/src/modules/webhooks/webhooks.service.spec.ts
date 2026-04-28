import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltyCacheService } from '../loyalty/loyalty.cache.service';
import type { LoyaltyWebhookPayload } from '@loyalty/shared-types';

// Mock bullmq Queue to avoid real Redis connections
jest.mock('bullmq', () => {
  const mockAdd = jest.fn().mockResolvedValue({ id: 'job-1' });
  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: mockAdd,
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
    })),
    __mockAdd: mockAdd,
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __mockAdd: mockQueueAdd } = jest.requireMock('bullmq');

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: DeepMockProxy<PrismaService>;
  let loyaltyCache: DeepMockProxy<LoyaltyCacheService>;

  const payload: LoyaltyWebhookPayload = {
    event_id: 'evt-001',
    event_type: 'transaction.created',
    occurred_at: new Date().toISOString(),
    guest_id: 'guest-123',
    data: {
      transaction_id: 'tx-1',
      type: 'earn',
      amount: 100,
      description: 'Purchase',
      new_balance: 600,
    },
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    loyaltyCache = mockDeep<LoyaltyCacheService>();
    const configService = mockDeep<ConfigService>();
    configService.get.mockReturnValue('redis://localhost:6379');

    mockQueueAdd.mockClear();

    const module = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: LoyaltyCacheService, useValue: loyaltyCache },
      ],
    }).compile();

    service = module.get(WebhooksService);
  });

  describe('handleBalanceChanged', () => {
    it('invalidates the cache for the given cell', async () => {
      await service.handleBalanceChanged('9139481833');
      expect(loyaltyCache.invalidateCache).toHaveBeenCalledWith('9139481833');
    });
  });

  describe('processEvent', () => {
    it('should enqueue event when event_id is new', async () => {
      prisma.transactionLog.findUnique.mockResolvedValue(null);

      await service.processEvent(payload);

      expect(prisma.transactionLog.findUnique).toHaveBeenCalledWith({
        where: { eventId: 'evt-001' },
      });
      expect(mockQueueAdd).toHaveBeenCalledWith(
        'transaction.created',
        payload,
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
    });

    it('should skip duplicate events (idempotency)', async () => {
      prisma.transactionLog.findUnique.mockResolvedValue({
        id: 'existing-1',
        eventId: 'evt-001',
        externalGuestId: 'guest-123',
        transactionId: 'tx-1',
        type: 'earn',
        amount: 100,
        newBalance: 600,
        description: 'Purchase',
        occurredAt: new Date(),
        processedAt: new Date(),
      });

      await service.processEvent(payload);

      // Should NOT enqueue
      expect(mockQueueAdd).not.toHaveBeenCalled();
    });

    it('should pass event_type as the job name', async () => {
      prisma.transactionLog.findUnique.mockResolvedValue(null);

      const balancePayload = { ...payload, event_type: 'balance.updated' as const };
      await service.processEvent(balancePayload);

      expect(mockQueueAdd).toHaveBeenCalledWith(
        'balance.updated',
        balancePayload,
        expect.any(Object),
      );
    });
  });
});
