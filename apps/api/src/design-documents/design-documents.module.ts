import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { DbModule } from 'src/db/db.module';
import { DesignDocumentsController } from './design-documents.controller';
import { DesignDocumentsService } from './design-documents.service';

@Module({
  imports: [DbModule, AuditModule],
  providers: [DesignDocumentsService],
  exports: [DesignDocumentsService],
  controllers: [DesignDocumentsController],
})
export class DesignDocumentsModule {}
