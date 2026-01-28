import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import authConfig from './conf/auth.config';
import emailConfig from './conf/email.config';
import { CryptoModule } from './crypto/crypto.module';
import { DbModule } from './db/db.module';
import { DevicesModule } from './devices/devices.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { InvitesController } from './invites/invites.controller';
import { InvitesModule } from './invites/invites.module';
import { InvitesService } from './invites/invites.service';
import { ModulesModule } from './modules/modules.module';
import { RolesModule } from './roles/roles.module';
import { SessionController } from './session/session.controller';
import { SessionModule } from './session/session.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, emailConfig],
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 45 },
      { name: 'auth', ttl: 60_000, limit: 20 },
    ]),
    DbModule,
    HealthModule,
    AuditModule,
    AuthModule,
    EmailModule,
    ClientsModule,
    SessionModule,
    CryptoModule,
    ModulesModule,
    RolesModule,
    DevicesModule,
    InvitesModule,
    UsersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, InvitesService],
  controllers: [SessionController, InvitesController],
})
export class AppModule {}
