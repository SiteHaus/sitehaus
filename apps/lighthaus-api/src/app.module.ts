import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import lighthausConfig from "./config/lighthaus.config";
import { DbModule } from "./db/db.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [lighthausConfig] }),
    ScheduleModule.forRoot(),
    DbModule,
  ],
})
export class AppModule {}
