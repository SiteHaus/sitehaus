import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import authConfig from './conf/auth.config';
import emailConfig from './conf/email.config';
import { DbModule } from './db/db.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { SessionController } from './session/session.controller';
import { SessionModule } from './session/session.module';
import { CryptoModule } from './crypto/crypto.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, emailConfig],
    }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 20 }]),
    DbModule,
    HealthModule,
    AuthModule,
    EmailModule,
    ClientsModule,
    SessionModule,
    CryptoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  controllers: [SessionController],
})
export class AppModule {}
