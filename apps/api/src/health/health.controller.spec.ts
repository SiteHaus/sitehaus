import type { Db } from '@site-haus/db';
import { IS_PUBLIC_KEY } from 'src/public.decorator';
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

  it('is public — health must be probeable without a token', () => {
    // The global AccessGuard 401s any route without this metadata; Docker,
    // load balancers, and Lighthaus all probe /health unauthenticated.
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController)).toBe(true);
  });
});
