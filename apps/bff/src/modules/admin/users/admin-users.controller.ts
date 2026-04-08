import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminUsersService } from './admin-users.service';
import { JwtStaffAuthGuard } from '../../auth/guards/jwt-staff-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { StaffRole } from '@loyalty/shared-types';

@ApiTags('admin')
@Controller('admin/users')
@UseGuards(JwtStaffAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT, StaffRole.ANALYST)
  @ApiOperation({ summary: 'List all users' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminUsersService.listUsers({ page, limit: Math.min(limit, 100), search });
  }

  @Get(':id')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Get user profile' })
  async getUser(@Param('id') id: string) {
    return this.adminUsersService.getUser(id);
  }

  @Get(':id/balance')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Get user loyalty balance' })
  async getUserBalance(@Param('id') id: string) {
    return this.adminUsersService.getUserBalance(id);
  }

  @Get(':id/transactions')
  @Roles(StaffRole.SUPER_ADMIN, StaffRole.ADMIN, StaffRole.SUPPORT)
  @ApiOperation({ summary: 'Get user transaction history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserTransactions(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminUsersService.getUserTransactions(id, page, Math.min(limit, 100));
  }
}
