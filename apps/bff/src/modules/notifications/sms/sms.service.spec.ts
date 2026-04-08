import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { SmsService } from './sms.service';
import { PrismaService } from '../../../prisma/prisma.service';
import type { SmsGateway, SmsResult } from './providers/sms-gateway.interface';

describe('SmsService', () => {
  let service: SmsService;
  let beeline: jest.Mocked<SmsGateway>;
  let alfa: jest.Mocked<SmsGateway>;
  let configService: DeepMockProxy<ConfigService>;
  let prisma: DeepMockProxy<PrismaService>;

  const phone = '79991234567';
  const code = '123456';

  beforeEach(async () => {
    beeline = {
      sendOtp: jest.fn(),
      getDeliveryStatus: jest.fn(),
    };
    alfa = {
      sendOtp: jest.fn(),
      getDeliveryStatus: jest.fn(),
    };
    configService = mockDeep<ConfigService>();
    prisma = mockDeep<PrismaService>();
    prisma.smsLog.create.mockResolvedValue({} as any);

    const module = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: 'BEELINE_SMS', useValue: beeline },
        { provide: 'ALFA_SMS', useValue: alfa },
        { provide: ConfigService, useValue: configService },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SmsService);
  });

  describe('sendOtp', () => {
    it('should send via primary provider (beeline) on success', async () => {
      configService.get.mockReturnValue('beeline');
      const successResult: SmsResult = { success: true, messageId: 'msg-1' };
      beeline.sendOtp.mockResolvedValue(successResult);

      const result = await service.sendOtp(phone, code);

      expect(result).toEqual(successResult);
      expect(beeline.sendOtp).toHaveBeenCalledWith(phone, code);
      expect(alfa.sendOtp).not.toHaveBeenCalled();
      // SMS logged
      expect(prisma.smsLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone,
          provider: 'beeline',
          status: 'delivered',
        }),
      });
    });

    it('should fall back to alfa when beeline times out', async () => {
      configService.get.mockReturnValue('beeline');
      // Beeline hangs forever (timeout will trigger)
      beeline.sendOtp.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000)),
      );
      const fallbackResult: SmsResult = { success: true, messageId: 'alfa-1' };
      alfa.sendOtp.mockResolvedValue(fallbackResult);

      const result = await service.sendOtp(phone, code);

      expect(result).toEqual(fallbackResult);
      expect(alfa.sendOtp).toHaveBeenCalledWith(phone, code);
    }, 10000);

    it('should fall back to alfa when beeline returns failure', async () => {
      configService.get.mockReturnValue('beeline');
      beeline.sendOtp.mockResolvedValue({ success: false, error: 'API error' });
      const fallbackResult: SmsResult = { success: true, messageId: 'alfa-2' };
      alfa.sendOtp.mockResolvedValue(fallbackResult);

      const result = await service.sendOtp(phone, code);

      expect(result).toEqual(fallbackResult);
      expect(beeline.sendOtp).toHaveBeenCalled();
      expect(alfa.sendOtp).toHaveBeenCalled();
    });

    it('should return failure when both providers fail', async () => {
      configService.get.mockReturnValue('beeline');
      beeline.sendOtp.mockResolvedValue({ success: false, error: 'Beeline down' });
      alfa.sendOtp.mockResolvedValue({ success: false, error: 'Alfa down' });

      const result = await service.sendOtp(phone, code);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Alfa down');
      // Both providers called
      expect(beeline.sendOtp).toHaveBeenCalled();
      expect(alfa.sendOtp).toHaveBeenCalled();
      // Failure logged
      expect(prisma.smsLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'alfa',
          status: 'failed',
        }),
      });
    });

    it('should use alfa as primary when configured', async () => {
      configService.get.mockReturnValue('alfa');
      alfa.sendOtp.mockResolvedValue({ success: true, messageId: 'alfa-3' });

      const result = await service.sendOtp(phone, code);

      expect(result.success).toBe(true);
      expect(alfa.sendOtp).toHaveBeenCalledWith(phone, code);
      expect(beeline.sendOtp).not.toHaveBeenCalled();
    });

    it('should fall back to beeline when alfa is primary and fails', async () => {
      configService.get.mockReturnValue('alfa');
      alfa.sendOtp.mockRejectedValue(new Error('Alfa network error'));
      beeline.sendOtp.mockResolvedValue({ success: true, messageId: 'bee-fallback' });

      const result = await service.sendOtp(phone, code);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('bee-fallback');
      expect(beeline.sendOtp).toHaveBeenCalled();
    });
  });
});
