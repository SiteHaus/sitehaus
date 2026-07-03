import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDb } from "@site-haus/db";
import { Pool } from "pg";
import { LIGHTHAUS_DB } from "./tokens";

@Global()
@Module({
  providers: [
    {
      provide: LIGHTHAUS_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createDb(new Pool({ connectionString: config.get<string>("lighthaus.databaseUrl") })),
    },
  ],
  exports: [LIGHTHAUS_DB],
})
export class DbModule {}
