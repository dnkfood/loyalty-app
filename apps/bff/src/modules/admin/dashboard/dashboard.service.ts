import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalUsers, activeUsers, campaignsSent, pushTotal, pushSent] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.authSession.groupBy({
          by: ['userId'],
          where: { createdAt: { gte: thirtyDaysAgo } },
        }).then((groups) => groups.length),
        this.prisma.campaign.count({
          where: { status: { in: ['done', 'running'] } },
        }),
        this.prisma.pushNotificationLog.count(),
        this.prisma.pushNotificationLog.count({
          where: { status: 'sent' },
        }),
      ]);

    const pushDeliveryRate =
      pushTotal > 0 ? Math.round((pushSent / pushTotal) * 10000) / 100 : 0;

    return {
      totalUsers,
      activeUsers,
      campaignsSent,
      pushDeliveryRate,
    };
  }
}
