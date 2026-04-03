import { Controller, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService, CreateStaffDto, UpdateStaffDto } from './staff.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { StaffRole } from '@loyalty/shared-types';

@ApiTags('admin')
@Controller('admin/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new staff user (Super Admin only)' })
  async createStaff(@Body() dto: CreateStaffDto) {
    return this.staffService.createStaff(dto);
  }

  @Patch(':id')
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update staff role or status (Super Admin only)' })
  async updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.updateStaff(id, dto);
  }
}
