import type { Db } from '@site-haus/db';
import { HealthController } from './health.controller';

describe('HealthController.checkApi', () => {
  const controller = new HealthController({} as Db);

  it('returns status, uptime, and version', () => {
    const res = controller.checkApi();
    expect(res.status).toBe('ok');
    expect(typeof res.uptime).toBe('number');
    expect(res.uptime).toBeGreaterThanOrEqual(0);
    expect(res.version).toBe(process.env.APP_VERSION ?? 'dev');
  });
});
