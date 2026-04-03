import { Module } from '@nestjs/common';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { CampaignsController } from './campaigns/campaigns.controller';
import { CampaignsService } from './campaigns/campaigns.service';
import { StaffController } from './staff/staff.controller';
import { StaffService } from './staff/staff.service';
import { AuditService } from './audit/audit.service';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminAuthController, AdminUsersController, CampaignsController, StaffController],
  providers: [AdminUsersService, CampaignsService, StaffService, AuditService],
  exports: [AuditService],
})
export class AdminModule {}
