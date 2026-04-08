import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  async registerPushToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android',
  ) {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform, isActive: true },
      update: { userId, platform, isActive: true, updatedAt: new Date() },
    });
  }

  async removePushToken(userId: string, token: string) {
    const existing = await this.prisma.pushToken.findUnique({
      where: { token },
    });

    if (existing && existing.userId === userId) {
      return this.prisma.pushToken.update({
        where: { token },
        data: { isActive: false },
      });
    }

    return { success: true };
  }
}
