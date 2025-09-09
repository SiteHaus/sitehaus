import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { ClientsService } from './clients.service';

@Module({
  imports: [DbModule],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
