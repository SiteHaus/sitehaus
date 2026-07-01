import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import lighthausConfig from "./config/lighthaus.config";
import { DbModule } from "./db/db.module";
import { DeadmanService } from "./deadman/deadman.service";
import { QueueModule } from "./dispatcher/queue.module";
import { HealthController } from "./health/health.controller";
import { HeartbeatController } from "./heartbeat/heartbeat.controller";
import { MonitorRepository } from "./persistence/monitor.repository";
import { SchedulerService } from "./scheduler/scheduler.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [lighthausConfig] }),
    ScheduleModule.forRoot(),
    DbModule,
    QueueModule,
  ],
  controllers: [HeartbeatController, HealthController],
  providers: [MonitorRepository, SchedulerService, DeadmanService],
})
export class AppModule {}
