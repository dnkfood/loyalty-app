import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface CreateAuditLogOptions {
  staffUserId: string;
  action: string;
  targetEntity?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit log entry for staff actions.
   */
  async log(options: CreateAuditLogOptions): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          staffUserId: options.staffUserId,
          action: options.action,
          targetEntity: options.targetEntity,
          targetId: options.targetId,
          details: options.details as any,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });
    } catch (err) {
      // Audit log failure must not break the main flow
      this.logger.error(`Failed to write audit log: ${(err as Error).message}`, options);
    }
  }

  /**
   * Gets audit log entries with pagination.
   */
  async getAuditLog(page = 1, limit = 50, staffUserId?: string) {
    const skip = (page - 1) * limit;
    const where = staffUserId ? { staffUserId } : {};

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          staffUser: {
            select: { email: true, name: true, role: true },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
