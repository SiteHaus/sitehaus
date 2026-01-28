import { Module } from '@nestjs/common';
import { AuditModule } from 'src/audit/audit.module';
import { CryptoModule } from 'src/crypto/crypto.module';
import { DbModule } from 'src/db/db.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [DbModule, CryptoModule, UsersModule, AuditModule],
})
export class InvitesModule {}
