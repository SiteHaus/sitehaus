import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ClientsService } from './clients/clients.service';
import authConfig from './conf/auth.config';
import emailConfig from './conf/email.config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { OtpService } from './otp/otp.service';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, emailConfig],
    }),
    DbModule,
    HealthModule,
    AuthModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService, OtpService, ClientsService],
})
export class AppModule {}
