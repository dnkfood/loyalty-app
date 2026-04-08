import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StaffService, CreateStaffDto, UpdateStaffDto } from './staff.service';
import { JwtStaffAuthGuard } from '../../auth/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { StaffRole } from '@loyalty/shared-types';

@ApiTags('admin')
@Controller('admin/staff')
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @Roles(StaffRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List staff users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listStaff(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.staffService.listStaff(page, Math.min(limit, 100));
  }

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
