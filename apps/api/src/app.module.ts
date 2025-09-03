import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import authConfig from './conf/auth.config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { OtpService } from './otp/otp.service';
import { ClientsService } from './clients/clients.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig],
    }),
    DbModule,
    HealthModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, OtpService, ClientsService],
})
export class AppModule {}
