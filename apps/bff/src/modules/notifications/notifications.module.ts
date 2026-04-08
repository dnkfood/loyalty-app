import { Module } from '@nestjs/common';
import { PushService } from './push/push.service';
import { PushQueue } from './push/push.queue';
import { SmsService } from './sms/sms.service';
import { SmsQueue } from './sms/sms.queue';
import { BeelineSmsGateway } from './sms/providers/beeline-sms.gateway';
import { AlfaSmsGateway } from './sms/providers/alfa-sms.gateway';

@Module({
  providers: [
    PushService,
    PushQueue,
    SmsService,
    SmsQueue,
    { provide: 'BEELINE_SMS', useClass: BeelineSmsGateway },
    { provide: 'ALFA_SMS', useClass: AlfaSmsGateway },
  ],
  exports: [PushService, PushQueue, SmsService, SmsQueue],
})
export class NotificationsModule {}
