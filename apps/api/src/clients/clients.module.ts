import { Module } from '@nestjs/common';
import { DbModule } from 'src/db/db.module';
import { ClientsService } from './clients.service';
import { ClientsOriginService } from './clients-origin/clients-origin.service';

@Module({
  imports: [DbModule],
  providers: [ClientsService, ClientsOriginService],
  exports: [ClientsService],
})
export class ClientsModule {}
