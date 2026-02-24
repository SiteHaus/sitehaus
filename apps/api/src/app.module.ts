import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import KeyvRedis from '@keyv/redis';
import { AssetsModule } from './assets/assets.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import authConfig from './conf/auth.config';
import emailConfig from './conf/email.config';
import redisConfig from './conf/redis.config';
import storageConfig from './conf/storage.config';
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
import { BusinessProfilesModule } from './business-profiles/business-profiles.module';
import { CommentsModule } from './comments/comments.module';
import { DesignDocumentsModule } from './design-documents/design-documents.module';
import { MilestonesModule } from './milestones/milestones.module';
import { ProjectsModule } from './projects/projects.module';
import { TicketsModule } from './tickets/tickets.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, emailConfig, storageConfig, redisConfig],
    }),
    BullModule.forRootAsync({
      inject: [redisConfig.KEY],
      useFactory: (cfg: ConfigType<typeof redisConfig>) => ({
        connection: { url: cfg.url },
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [redisConfig.KEY],
      useFactory: (cfg: ConfigType<typeof redisConfig>) => ({
        store: new KeyvRedis(cfg.url),
        ttl: 60_000,
      }),
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
    CommentsModule,
    ProjectsModule,
    BusinessProfilesModule,
    DesignDocumentsModule,
    TicketsModule,
    MilestonesModule,
    AssetsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, InvitesService],
  controllers: [SessionController, InvitesController],
})
export class AppModule {}
