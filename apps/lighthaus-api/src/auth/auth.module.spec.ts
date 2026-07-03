import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import lighthausConfig from "../config/lighthaus.config";
import { LIGHTHAUS_DB } from "../db/tokens";
import { AccessGuard } from "./access.guard";
import { AuthModule } from "./auth.module";

// Stand-in for the (global) DbModule so MonitorRepository can be instantiated —
// the wiring test cares about module graph resolution, not a real connection.
@Global()
@Module({
  providers: [{ provide: LIGHTHAUS_DB, useValue: {} }],
  exports: [LIGHTHAUS_DB],
})
class FakeDbModule {}

describe("AuthModule wiring", () => {
  // Regression: AccessGuard depends on MonitorRepository, so AuthModule must
  // import a module that provides it. A manual `new AccessGuard()` (as the guard
  // unit test does) never exercises this — only compiling the module does. Before
  // PersistenceModule was imported here, this threw UnknownDependenciesException.
  it("resolves AccessGuard through DI (MonitorRepository dependency satisfied)", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [lighthausConfig] }),
        FakeDbModule,
        AuthModule,
      ],
    }).compile();

    expect(moduleRef.get(AccessGuard)).toBeInstanceOf(AccessGuard);
  });
});
