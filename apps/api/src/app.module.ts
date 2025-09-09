import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { ClientsService } from './clients/clients.service';
import authConfig from './conf/auth.config';
import emailConfig from './conf/email.config';
import { DbModule } from './db/db.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';

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
    ClientsModule,
  ],
  providers: [ClientsService],
})
export class AppModule {}
