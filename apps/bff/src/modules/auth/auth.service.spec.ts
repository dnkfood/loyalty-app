import { Test } from '@nestjs/testing';
import { UnauthorizedException, HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsQueue } from '../notifications/sms/sms.queue';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: DeepMockProxy<PrismaService>;
  let jwtService: DeepMockProxy<JwtService>;
  let configService: DeepMockProxy<ConfigService>;
  let smsQueue: DeepMockProxy<SmsQueue>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    jwtService = mockDeep<JwtService>();
    configService = mockDeep<ConfigService>();
    smsQueue = mockDeep<SmsQueue>();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: SmsQueue, useValue: smsQueue },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  describe('sendOtp', () => {
    const phone = '79991234567';

    it('should generate OTP, save hash to DB, and enqueue SMS', async () => {
      prisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpCode.create.mockResolvedValue({
        id: 'otp-1',
        phone,
        codeHash: 'hash',
        attempts: 0,
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      });
      smsQueue.enqueue.mockResolvedValue();
      configService.get.mockReturnValue('production');

      const result = await authService.sendOtp({ phone });

      expect(result).toEqual({ message: 'OTP sent successfully' });
      // Previous OTPs invalidated
      expect(prisma.otpCode.updateMany).toHaveBeenCalledWith({
        where: { phone, usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      // New OTP created with hash
      expect(prisma.otpCode.create).toHaveBeenCalledWith({
        data: {
          phone,
          codeHash: expect.any(String),
          expiresAt: expect.any(Date),
        },
      });
      // SMS enqueued
      expect(smsQueue.enqueue).toHaveBeenCalledWith(phone, expect.stringMatching(/^\d{6}$/));
    });

    it('should generate a 6-digit OTP code', async () => {
      prisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
      prisma.otpCode.create.mockResolvedValue({
        id: 'otp-1', phone, codeHash: 'h', attempts: 0,
        expiresAt: new Date(), usedAt: null, createdAt: new Date(),
      });
      smsQueue.enqueue.mockResolvedValue();
      configService.get.mockReturnValue('production');

      await authService.sendOtp({ phone });

      const enqueuedCode = smsQueue.enqueue.mock.calls[0][1];
      expect(enqueuedCode).toMatch(/^\d{6}$/);
      expect(parseInt(enqueuedCode, 10)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(enqueuedCode, 10)).toBeLessThanOrEqual(999999);
    });
  });

  describe('verifyOtp', () => {
    const phone = '79991234567';
    const code = '123456';
    const userId = 'user-1';

    it('should verify valid OTP and return tokens + user', async () => {
      const codeHash = await bcrypt.hash(code, 10);
      prisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1', phone, codeHash, attempts: 0,
        expiresAt: new Date(Date.now() + 300000), usedAt: null,
        createdAt: new Date(),
      });
      prisma.otpCode.update.mockResolvedValue({} as any);
      prisma.user.findUnique.mockResolvedValue({
        id: userId, phone, name: 'Test', email: null,
        externalGuestId: null, birthDate: null, avatarUrl: null,
        consentGiven: false, consentGivenAt: null, consentVersion: null,
        isActive: true, createdAt: new Date(), updatedAt: new Date(),
      });
      prisma.authSession.create.mockResolvedValue({} as any);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      configService.get.mockReturnValue('secret');

      const result = await authService.verifyOtp({ phone, code });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe(userId);
      expect(result.user.phone).toBe(phone);
      // OTP marked as used
      expect(prisma.otpCode.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('should throw OTP_EXPIRED if no valid OTP found', async () => {
      prisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(authService.verifyOtp({ phone, code }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw OTP_INVALID for wrong code', async () => {
      const wrongHash = await bcrypt.hash('999999', 10);
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
      prisma.user.create.mockResolvedValue({
        id: 'new-user', phone, name: null, email: null,
        externalGuestId: null, birthDate: null, avatarUrl: null,
        consentGiven: false, consentGivenAt: null, consentVersion: null,
        isActive: true, createdAt: new Date(), updatedAt: new Date(),
      });
      prisma.authSession.create.mockResolvedValue({} as any);
      jwtService.sign.mockReturnValue('token');
      configService.get.mockReturnValue('secret');

      const result = await authService.verifyOtp({ phone, code });

      expect(prisma.user.create).toHaveBeenCalledWith({ data: { phone } });
      expect(result.user.id).toBe('new-user');
    });
  });
});
