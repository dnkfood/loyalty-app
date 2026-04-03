import { Controller, Get, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OffersService } from './offers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCodes } from '@loyalty/shared-types';

@ApiTags('offers')
@Controller('offers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get personalized offers' })
  async getOffers(@CurrentUser() user: JwtPayload) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { externalGuestId: true },
    });

    if (!dbUser?.externalGuestId) {
      throw new NotFoundException({
        code: ErrorCodes.GUEST_NOT_FOUND,
        message: 'User not linked to loyalty system',
      });
    }

    return this.offersService.getOffers(user.sub, dbUser.externalGuestId);
  }
}
