import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { DbModule } from 'src/db/db.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [DbModule, AuditModule],
  providers: [ProjectsService],
  exports: [ProjectsService],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
