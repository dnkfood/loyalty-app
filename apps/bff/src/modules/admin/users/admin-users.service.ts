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
}
