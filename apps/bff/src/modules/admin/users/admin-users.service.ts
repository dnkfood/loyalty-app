import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { maskPhone } from '@loyalty/shared-utils';

export interface AdminUserListOptions {
  page?: number;
  limit?: number;
  search?: string;
}

@Injectable()
export class AdminUsersService {
  private readonly logger = new Logger(AdminUsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists users with pagination and optional search.
   */
  async listUsers(options: AdminUserListOptions = {}) {
    const { page = 1, limit = 20, search } = options;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          isActive: true,
          consentGiven: true,
          createdAt: true,
          externalGuestId: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users.map((u) => ({ ...u, phone: maskPhone(u.phone) })),
      total,
      page,
      limit,
    };
  }

  /**
   * Gets a single user profile (masked phone for logs).
   */
  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        birthDate: true,
        isActive: true,
        consentGiven: true,
        consentGivenAt: true,
        consentVersion: true,
        createdAt: true,
        updatedAt: true,
        externalGuestId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`Admin viewed user ${userId}`);
    return { ...user, phone: maskPhone(user.phone) };
  }

  /**
   * Gets the loyalty balance for a user.
   */
  async getUserBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, externalGuestId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cache = await this.prisma.loyaltyCache.findUnique({
      where: { userId },
    });

    return {
      userId,
      balance: cache?.balance ?? 0,
      statusLevel: cache?.statusLevel ?? null,
      statusName: cache?.statusName ?? null,
      nextLevelPoints: cache?.nextLevelPoints ?? null,
      cachedAt: cache?.cachedAt ?? null,
    };
  }

  /**
   * Gets transaction history for a user with pagination.
   */
  async getUserTransactions(userId: string, page: number, limit: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, externalGuestId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.externalGuestId) {
      return { items: [], total: 0, page, limit };
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transactionLog.findMany({
        where: { externalGuestId: user.externalGuestId },
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.transactionLog.count({
        where: { externalGuestId: user.externalGuestId },
      }),
    ]);

    return { items: transactions, total, page, limit };
  }

  /**
   * Gets all auth sessions for a user.
   */
  async getUserSessions(userId: string) {
    const sessions = await this.prisma.authSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        deviceInfo: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return { items: sessions };
  }

  /**
   * Gets push tokens for a user (token values masked).
   */
  async getUserPushTokens(userId: string) {
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        token: true,
        platform: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      items: tokens.map((t) => ({
        ...t,
        token: t.token.length > 12
          ? `${t.token.slice(0, 6)}...${t.token.slice(-6)}`
          : '***',
      })),
    };
  }
}
