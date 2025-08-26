import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccessGuard } from './auth/access/access.guard';
import { AuthModule } from './auth/auth.module';
import authConfig from './conf/auth.config';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { UsersService } from './users/users.service';

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
  providers: [
    AppService,
    UsersService,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AppModule {}
