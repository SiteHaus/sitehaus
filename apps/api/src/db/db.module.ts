import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { schema, type Schema } from '@site-haus/db';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const PG_POOL = Symbol('PG_POOL');
export const DRIZZLE = Symbol('DRIZZLE');

export type Db = NodePgDatabase<Schema>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DbModule implements OnModuleDestroy {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}
  onModuleDestroy() {
    console.log('On Destroy');
  }
}
