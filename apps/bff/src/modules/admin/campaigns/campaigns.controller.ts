import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService, CreateCampaignDto } from './campaigns.service';
import { JwtStaffAuthGuard } from '../../auth/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { StaffRole } from '@loyalty/shared-types';
import type { JwtStaffPayload } from '../../auth/strategies/jwt-staff.strategy';

@ApiTags('admin')
@Controller('admin/campaigns')
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETER)
  @ApiOperation({ summary: 'Create a push notification campaign' })
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: JwtStaffPayload,
  ) {
    return this.campaignsService.createCampaign(dto, user.sub);
  }

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETER, StaffRole.ANALYST)
  @ApiOperation({ summary: 'List campaigns' })
  async listCampaigns(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.campaignsService.listCampaigns(page, Math.min(limit, 100));
  }

  @Post(':id/launch')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.MARKETER)
  @ApiOperation({ summary: 'Launch a campaign immediately' })
  async launchCampaign(@Param('id') id: string) {
    return this.campaignsService.launchCampaign(id);
  }
}
