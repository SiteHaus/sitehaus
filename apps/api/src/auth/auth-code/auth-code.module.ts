import { Module } from '@nestjs/common';
import { CryptoModule } from 'src/crypto/crypto.module';
import { DbModule } from 'src/db/db.module';
import { SessionModule } from 'src/session/session.module';
import { AuthCodeService } from './auth-code.service';

@Module({
  imports: [DbModule, CryptoModule, SessionModule],
  providers: [AuthCodeService],
  exports: [AuthCodeService],
})
export class AuthCodeModule {}
