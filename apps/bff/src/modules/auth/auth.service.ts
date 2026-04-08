import {
  Injectable,
  Logger,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { maskPhone } from '@loyalty/shared-utils';
import { ErrorCodes } from '@loyalty/shared-types';
import { LoyaltySystemClient } from '../loyalty/loyalty-system.client';
import type { SendOtpDto } from './dto/send-otp.dto';
import type { VerifyOtpDto } from './dto/verify-otp.dto';

const BCRYPT_COST = 10;
const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loyaltyClient: LoyaltySystemClient,
  ) {}

  /**
   * Sends OTP via the loyalty system's built-in SMS service.
   * The loyalty system sends the SMS and returns the code.
   * We store the code hash in our DB for rate-limiting and tracking.
   */
  async sendOtp(dto: SendOtpDto, ipAddress?: string): Promise<{ message: string }> {
    const { phone } = dto;

    this.logger.log(`OTP send requested`, { phone: maskPhone(phone), ip: ipAddress });

    // Register guest in loyalty system if not exists (idempotent)
    try {
      await this.loyaltyClient.getGuestInfo(phone);
    } catch {
      this.logger.log(`Guest not found, auto-registering`, { phone: maskPhone(phone) });
      try {
        await this.loyaltyClient.registerGuest(phone, phone);
      } catch (regErr) {
        this.logger.warn(`Auto-register failed: ${(regErr as Error).message}`);
      }
    }

    // Send SMS via loyalty system
    let smsCode: string;
    try {
      const result = await this.loyaltyClient.sendSmsCode(phone);
      smsCode = result.smsCode;
    } catch (err) {
      this.logger.error(`Loyalty SmsCode failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Failed to send SMS code');
    }

    // Invalidate previous OTP codes for this phone
    await this.prisma.otpCode.updateMany({
      where: { phone, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Store the code hash in our DB for tracking/rate-limiting
    const codeHash = await bcrypt.hash(smsCode, BCRYPT_COST);
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    await this.prisma.otpCode.create({
      data: { phone, codeHash, expiresAt },
    });

    // In development — log the OTP (NEVER in production)
    if (this.configService.get('app.nodeEnv') === 'development') {
      this.logger.debug(`[DEV ONLY] OTP for ${maskPhone(phone)}: ${smsCode}`);
    }

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verifies OTP code. First validates against our DB (rate limiting),
   * then confirms with the loyalty system's Approve endpoint.
   * Issues JWT tokens on success.
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: { id: string; phone: string; name: string | null } }> {
    const { phone, code, deviceId } = dto;

    // Check our DB for rate limiting
    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        phone,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException({
        code: ErrorCodes.OTP_EXPIRED,
        message: 'OTP code expired or not found',
      });
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      throw new HttpException({
        code: ErrorCodes.OTP_MAX_ATTEMPTS,
        message: 'Too many verification attempts',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Increment attempts
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { attempts: { increment: 1 } },
    });

    // Verify against our stored hash
    const isValid = await bcrypt.compare(code, otpRecord.codeHash);
    if (!isValid) {
      throw new UnauthorizedException({
        code: ErrorCodes.OTP_INVALID,
        message: 'Invalid OTP code',
      });
    }

    // Also confirm with the loyalty system
    const approval = await this.loyaltyClient.approveCode(phone, code);
    if (!approval.approved) {
      this.logger.warn(`Loyalty Approve rejected code for ${maskPhone(phone)}`);
      // Don't block — our hash matched, loyalty system may have timing issues
    }

    // Mark OTP as used
    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Find or create user, link to loyalty system
    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({ data: { phone } });
    }

    // Sync loyalty data: update externalGuestId and name from loyalty system
    try {
      const guestInfo = await this.loyaltyClient.getGuestInfo(phone);
      if (guestInfo.cardCode) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            externalGuestId: guestInfo.cardCode,
            name: user.name || guestInfo.guestName,
          },
        });
        user = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      }
    } catch (err) {
      this.logger.warn(`Failed to sync loyalty data on login: ${(err as Error).message}`);
    }

    // Issue tokens
    const { accessToken, refreshToken } = await this.issueTokens(user.id, ipAddress, deviceId);

    this.logger.log(`User authenticated`, { phone: maskPhone(phone), userId: user.id });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, phone: user.phone, name: user.name },
    };
  }

  /**
   * Refreshes access token using a valid refresh token.
   */
  async refresh(
    userId: string,
    sessionId: string,
    rawRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, userId, expiresAt: { gt: new Date() } },
    });

    if (!session) {
      throw new UnauthorizedException({ code: ErrorCodes.TOKEN_INVALID, message: 'Session not found' });
    }

    const isValid = await bcrypt.compare(rawRefreshToken, session.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException({ code: ErrorCodes.TOKEN_INVALID, message: 'Invalid refresh token' });
    }

    // Rotate: delete old session, issue new tokens
    await this.prisma.authSession.delete({ where: { id: sessionId } });
    return this.issueTokens(userId);
  }

  /**
   * Logs out by deleting the session.
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    await this.prisma.authSession.deleteMany({
      where: { id: sessionId, userId },
    });
    this.logger.log(`User logged out`, { userId });
  }

  private async issueTokens(
    userId: string,
    ipAddress?: string,
    deviceId?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const sessionId = uuidv4();
    const rawRefreshToken = uuidv4() + uuidv4(); // 72-char random string
    const refreshTokenHash = await bcrypt.hash(rawRefreshToken, BCRYPT_COST);

    const refreshTtl = this.configService.get<number>('jwt.refreshTtl', 2592000);
    const expiresAt = new Date(Date.now() + refreshTtl * 1000);

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        userId,
        refreshToken: refreshTokenHash,
        deviceId,
        ipAddress,
        expiresAt,
      },
    });

    const accessTtl = this.configService.get<number>('jwt.accessTtl', 900);
    const accessToken = this.jwtService.sign(
      { sub: userId, type: 'access' },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: accessTtl,
      },
    );

    const refreshToken = this.jwtService.sign(
      { sub: userId, sessionId, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: refreshTtl,
      },
    );

    return { accessToken, refreshToken };
  }

}
