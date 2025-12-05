import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { HealthController } from './health.controller';

@Module({
  imports: [DbModule],
  controllers: [HealthController],
})
export class HealthModule {}
