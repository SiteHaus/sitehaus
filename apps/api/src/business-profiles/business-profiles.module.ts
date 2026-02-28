import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { DbModule } from 'src/db/db.module';
import { BusinessProfilesController } from './business-profiles.controller';
import { BusinessProfilesService } from './business-profiles.service';

@Module({
  imports: [DbModule, AuditModule],
  providers: [BusinessProfilesService],
  exports: [BusinessProfilesService],
  controllers: [BusinessProfilesController],
})
export class BusinessProfilesModule {}
