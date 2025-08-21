import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type Db, DRIZZLE } from 'src/db/db.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  @Get('db')
  async checkDb() {
    await this.db.execute(sql`select 1`);
    return { status: 'ok' };
  }

  @Get()
  checkApi() {
    return { status: 'ok' };
  }
}
