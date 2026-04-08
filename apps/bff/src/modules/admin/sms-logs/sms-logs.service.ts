import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { maskPhone } from '@loyalty/shared-utils';

@Injectable()
export class SmsLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSmsLogs(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.smsLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.smsLog.count(),
    ]);

    return {
      items: logs.map((log) => ({
        ...log,
        phone: maskPhone(log.phone),
      })),
      total,
      page,
      limit,
    };
  }
}
