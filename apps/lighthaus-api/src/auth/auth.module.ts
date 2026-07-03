import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PersistenceModule } from "../persistence/persistence.module";
import { AccessGuard } from "./access.guard";

@Module({
  imports: [
    PersistenceModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // Mirror apps/api: HS256 with the shared IAM secret.
      useFactory: (config: ConfigService) => ({
        secret: config.get<Buffer>("lighthaus.jwtSecret") ?? undefined,
        signOptions: { algorithm: "HS256" as const },
        verifyOptions: { algorithms: ["HS256"] as const },
      }),
    }),
  ],
  providers: [AccessGuard],
  exports: [AccessGuard, JwtModule],
})
export class AuthModule {}
