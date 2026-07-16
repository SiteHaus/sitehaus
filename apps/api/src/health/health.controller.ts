import { Controller, Get, Inject } from '@nestjs/common';
import { sql, type Db } from '@site-haus/db';
import { DRIZZLE } from 'src/db/tokens';
import { Public } from 'src/public.decorator';

// Public: probed unauthenticated by Docker, load balancers, and Lighthaus
// service_health checks. Without @Public() the global AccessGuard 401s it
// and every prober reports the api down.
@Public()
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
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      version: process.env.APP_VERSION ?? 'dev',
    };
  }
}
