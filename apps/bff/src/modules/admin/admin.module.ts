import { Module } from '@nestjs/common';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { CampaignsController } from './campaigns/campaigns.controller';
import { CampaignsService } from './campaigns/campaigns.service';
import { StaffController } from './staff/staff.controller';
import { StaffService } from './staff/staff.service';
import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';
import { AdminAuthController } from './auth/admin-auth.controller';
import { SmsLogsController } from './sms-logs/sms-logs.controller';
import { SmsLogsService } from './sms-logs/sms-logs.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [
    AdminAuthController,
    AdminUsersController,
    CampaignsController,
    StaffController,
    SmsLogsController,
    DashboardController,
    AuditController,
  ],
  providers: [
    AdminUsersService,
    CampaignsService,
    StaffService,
    AuditService,
    SmsLogsService,
    DashboardService,
  ],
  exports: [AuditService],
})
export class AdminModule {}
