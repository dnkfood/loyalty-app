import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { BalanceUpdatedHandler } from './handlers/balance-updated.handler';
import { TransactionCreatedHandler } from './handlers/transaction-created.handler';
import { StatusChangedHandler } from './handlers/status-changed.handler';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [LoyaltyModule, NotificationsModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    BalanceUpdatedHandler,
    TransactionCreatedHandler,
    StatusChangedHandler,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
