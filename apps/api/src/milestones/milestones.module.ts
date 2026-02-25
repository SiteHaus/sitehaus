import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { DbModule } from 'src/db/db.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { MilestonesController } from './milestones.controller';
import { MilestonesService } from './milestones.service';

@Module({
  imports: [DbModule, AuditModule, NotificationsModule],
  providers: [MilestonesService],
  exports: [MilestonesService],
  controllers: [MilestonesController],
})
export class MilestonesModule {}
