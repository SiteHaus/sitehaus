import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { CryptoModule } from 'src/crypto/crypto.module';
import { DbModule } from 'src/db/db.module';
import { DevicesModule } from 'src/devices/devices.module';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

@Module({
  imports: [DbModule, CryptoModule, DevicesModule, AuditModule],
  providers: [SessionService],
  controllers: [SessionController],
  exports: [SessionService],
})
export class SessionModule {}
