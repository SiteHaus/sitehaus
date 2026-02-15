import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { DbModule } from 'src/db/db.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [DbModule, AuditModule],
  providers: [CommentsService],
  exports: [CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
