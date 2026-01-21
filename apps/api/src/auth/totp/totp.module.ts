import { Module } from '@nestjs/common';
import { CryptoModule } from 'src/crypto/crypto.module';
import { DbModule } from 'src/db/db.module';
import { TotpService } from './totp.service';

@Module({
  imports: [DbModule, CryptoModule],
  providers: [TotpService],
  exports: [TotpService],
})
export class TotpModule {}
