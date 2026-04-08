import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtStaffAuthGuard } from '../../auth/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { StaffRole } from '@loyalty/shared-types';

@ApiTags('admin')
@Controller('admin/dashboard')
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.ANALYST)
  @ApiOperation({ summary: 'Get admin dashboard summary' })
  async getDashboard() {
    return this.dashboardService.getDashboard();
  }
}
