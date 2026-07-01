import { S3Client } from "@aws-sdk/client-s3";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import lighthausConfig from "./config/lighthaus.config";
import { DbModule } from "./db/db.module";
import { DeadmanService } from "./deadman/deadman.service";
import { QueueModule } from "./dispatcher/queue.module";
import { HealthController } from "./health/health.controller";
import { HeartbeatController } from "./heartbeat/heartbeat.controller";
import { MonitorRepository } from "./persistence/monitor.repository";
import { SchedulerService } from "./scheduler/scheduler.service";
import { SnapshotService } from "./snapshot/snapshot.service";
import { R2_CLIENT } from "./snapshot/tokens";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [lighthausConfig] }),
    ScheduleModule.forRoot(),
    DbModule,
    QueueModule,
  ],
  controllers: [HeartbeatController, HealthController],
  providers: [
    MonitorRepository,
    SchedulerService,
    DeadmanService,
    SnapshotService,
    {
      provide: R2_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new S3Client({
          region: "auto",
          endpoint: `https://${config.get<string>("lighthaus.r2.accountId")}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: config.get<string>("lighthaus.r2.accessKeyId")!,
            secretAccessKey: config.get<string>("lighthaus.r2.secretAccessKey")!,
          },
        }),
    },
  ],
})
export class AppModule {}
