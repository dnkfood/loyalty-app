import { Test } from '@nestjs/testing';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltySystemClient } from '../loyalty/loyalty-system.client';
import { SmsService } from '../notifications/sms/sms.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: DeepMockProxy<PrismaService>;
  let jwtService: DeepMockProxy<JwtService>;
  let configService: DeepMockProxy<ConfigService>;
  let loyaltyClient: DeepMockProxy<LoyaltySystemClient>;
  let smsService: DeepMockProxy<SmsService>;

  const phone = '79991234567';
  const userId = 'user-1';
  const mockUser = {
    id: userId, phone, name: 'Test', email: null,
    externalGuestId: '810885688', birthDate: null, avatarUrl: null,
    consentGiven: false, consentGivenAt: null, consentVersion: null,
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    jwtService = mockDeep<JwtService>();
    configService = mockDeep<ConfigService>();
    loyaltyClient = mockDeep<LoyaltySystemClient>();
    smsService = mockDeep<SmsService>();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: LoyaltySystemClient, useValue: loyaltyClient },
        { provide: SmsService, useValue: smsService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('sendOtp', () => {
    it('should generate OTP, send via SmsService, ping loyalty, and store hash', async () => {
      smsService.sendOtp.mockResolvedValue({ success: true, messageId: 'msg-1' });
      loyaltyClient.sendSmsCode.mockResolvedValue(undefined);
      prisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpCode.create.mockResolvedValue({
        id: 'otp-1', phone, codeHash: 'hash', attempts: 0,
        expiresAt: new Date(), usedAt: null, createdAt: new Date(),
      });
      configService.get.mockReturnValue('production');

      const result = await authService.sendOtp({ phone });

      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(smsService.sendOtp).toHaveBeenCalledWith(phone, expect.any(String));
      expect(loyaltyClient.sendSmsCode).toHaveBeenCalledWith(phone);
      expect(prisma.otpCode.create).toHaveBeenCalledWith({
        data: {
          phone,
          codeHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should propagate ServiceUnavailable if SMS provider fails', async () => {
      smsService.sendOtp.mockResolvedValue({ success: false, error: 'down' });

      await expect(authService.sendOtp({ phone })).rejects.toThrow(
        'Failed to send SMS code',
      );
      // Loyalty must NOT be pinged if the real SMS never went out
      expect(loyaltyClient.sendSmsCode).not.toHaveBeenCalled();
    });

    it('should still succeed if loyalty ping fails (best-effort)', async () => {
      smsService.sendOtp.mockResolvedValue({ success: true, messageId: 'msg-1' });
      loyaltyClient.sendSmsCode.mockRejectedValue(new Error('loyalty down'));
      prisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpCode.create.mockResolvedValue({
        id: 'otp-1', phone, codeHash: 'hash', attempts: 0,
        expiresAt: new Date(), usedAt: null, createdAt: new Date(),
      });
      configService.get.mockReturnValue('production');

      const result = await authService.sendOtp({ phone });

      expect(result).toEqual({ message: 'OTP sent successfully' });
      expect(prisma.otpCode.create).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    const code = '8674830';

    it('should verify valid OTP, sync loyalty data, and return tokens', async () => {
      const codeHash = await bcrypt.hash(code, 10);
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1', phone, codeHash, attempts: 0,
        expiresAt: new Date(Date.now() + 300000), usedAt: null,
        createdAt: new Date(),
      });
      prisma.otpCode.update.mockResolvedValue({} as any);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      prisma.authSession.create.mockResolvedValue({} as any);
      loyaltyClient.getGuestInfo.mockResolvedValue({
        balance: 200, bonusPercent: 5, maxPercent: 30,
        cardCode: '810885688', guestName: 'Test', nextLevelSumma: 25000,
        statusLevel: 'FRIEND', cell: phone, levels: [],
      });
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      configService.get.mockReturnValue('secret');

      const result = await authService.verifyOtp({ phone, code });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe(userId);
    });

    it('should throw OTP_EXPIRED if no valid OTP found', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(authService.verifyOtp({ phone, code }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw OTP_INVALID for wrong code', async () => {
      const wrongHash = await bcrypt.hash('000000', 10);
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1', phone, codeHash: wrongHash, attempts: 0,
        expiresAt: new Date(Date.now() + 300000), usedAt: null,
        createdAt: new Date(),
      });
      prisma.otpCode.update.mockResolvedValue({} as any);

      await expect(authService.verifyOtp({ phone, code }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw TOO_MANY_REQUESTS if max attempts reached', async () => {
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1', phone, codeHash: 'hash', attempts: 5,
        expiresAt: new Date(Date.now() + 300000), usedAt: null,
        createdAt: new Date(),
      });

      await expect(authService.verifyOtp({ phone, code }))
        .rejects.toThrow(HttpException);
    });

    it('should create new user if phone not registered', async () => {
      const codeHash = await bcrypt.hash(code, 10);
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1', phone, codeHash, attempts: 0,
        expiresAt: new Date(Date.now() + 300000), usedAt: null,
        createdAt: new Date(),
      });
      prisma.otpCode.update.mockResolvedValue({} as any);
      prisma.user.findUnique.mockResolvedValue(null);
      const newUser = { ...mockUser, id: 'new-user', name: null, externalGuestId: null };
      prisma.user.create.mockResolvedValue(newUser);
      prisma.user.update.mockResolvedValue({ ...newUser, externalGuestId: '810885688' });
      prisma.user.findUniqueOrThrow.mockResolvedValue({ ...newUser, externalGuestId: '810885688' });
      prisma.authSession.create.mockResolvedValue({} as any);
      loyaltyClient.getGuestInfo.mockResolvedValue({
        balance: 200, bonusPercent: 5, maxPercent: 30,
        cardCode: '810885688', guestName: null, nextLevelSumma: 25000,
        statusLevel: 'FRIEND', cell: phone, levels: [],
      });
      jwtService.sign.mockReturnValue('token');
      configService.get.mockReturnValue('secret');

      const result = await authService.verifyOtp({ phone, code });

      expect(prisma.user.create).toHaveBeenCalledWith({ data: { phone } });
      expect(result.user.id).toBe('new-user');
    });
  });
});
