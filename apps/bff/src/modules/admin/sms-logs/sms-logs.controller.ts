import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SmsLogsService } from './sms-logs.service';
import { JwtStaffAuthGuard } from '../../auth/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { StaffRole } from '@loyalty/shared-types';

@ApiTags('admin')
@Controller('admin/sms-logs')
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SmsLogsController {
  constructor(private readonly smsLogsService: SmsLogsService) {}

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'List SMS delivery logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listSmsLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.smsLogsService.listSmsLogs(page, Math.min(limit, 100));
  }
}
