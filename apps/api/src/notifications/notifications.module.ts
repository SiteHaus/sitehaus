import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DbModule } from 'src/db/db.module';
import { EmailModule } from 'src/email/email.module';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsService, NOTIFICATIONS_QUEUE } from './notifications.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    DbModule,
    EmailModule,
  ],
  providers: [NotificationsService, NotificationsProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
