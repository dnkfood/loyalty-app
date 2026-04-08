import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PushQueue } from '../../notifications/push/push.queue';
import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Весенняя акция' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Успейте воспользоваться нашим предложением!' })
  @IsString()
  body!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  segmentIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushQueue: PushQueue,
  ) {}

  /**
   * Creates a new push notification campaign.
   */
  async createCampaign(dto: CreateCampaignDto, staffUserId: string) {
    const campaign = await this.prisma.campaign.create({
      data: {
        title: dto.title,
        body: dto.body,
        segmentIds: dto.segmentIds ?? [],
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: dto.scheduledAt ? 'scheduled' : 'draft',
        createdById: staffUserId,
      },
    });

    this.logger.log(`Campaign created: ${campaign.id} by staff ${staffUserId}`);
    return campaign;
  }

  /**
   * Lists campaigns with pagination.
   */
  async listCampaigns(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.campaign.count(),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Launches a campaign immediately.
   */
  async launchCampaign(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'running', startedAt: new Date() },
    });

    // Find target users based on campaign segments
    let userIds: string[];

    if (campaign.segmentIds.length > 0) {
      const targets = await this.prisma.loyaltyCache.findMany({
        where: { segmentIds: { hasSome: campaign.segmentIds } },
        select: { userId: true },
      });
      userIds = targets.map((t) => t.userId);
    } else {
      // No segments specified — target all users with active push tokens
      const tokens = await this.prisma.pushToken.findMany({
        where: { isActive: true },
        select: { userId: true },
        distinct: ['userId'],
      });
      userIds = tokens.map((t) => t.userId);
    }

    // Enqueue campaign push for each target user
    for (const userId of userIds) {
      await this.pushQueue.enqueueCampaignPush({
        userId,
        title: campaign.title,
        body: campaign.body,
        campaignId: campaign.id,
      });
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { sentCount: userIds.length },
    });

    this.logger.log(`Campaign ${campaignId} launched, enqueued ${userIds.length} push notifications`);

    return { launched: true, campaignId, enqueuedCount: userIds.length };
  }
}
