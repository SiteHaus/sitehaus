import { Module } from "@nestjs/common";
import { MonitorRepository } from "./monitor.repository";

// Single home for MonitorRepository so every module that needs it (AppModule's
// services + AuthModule's AccessGuard) shares one instance. LIGHTHAUS_DB is
// provided globally by DbModule, so this module only needs to declare the repo.
@Module({
  providers: [MonitorRepository],
  exports: [MonitorRepository],
})
export class PersistenceModule {}
