import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { DbModule } from 'src/db/db.module';
import { StorageModule } from 'src/storage/storage.module';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [DbModule, AuditModule, StorageModule],
  providers: [TicketsService, TicketAttachmentsService],
  exports: [TicketsService],
  controllers: [TicketsController],
})
export class TicketsModule {}
