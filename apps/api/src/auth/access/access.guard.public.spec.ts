import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AccessGuard } from './access.guard';

describe('AccessGuard @Public bypass', () => {
  it('returns true and does not verify token', async () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => true),
    } as unknown as Reflector;
    const jwt = { verifyAsync: jest.fn() } as unknown as JwtService;
    const db = { query: { sessionsTable: { findFirst: jest.fn() } } };

    const guard = new AccessGuard(jwt, reflector, db as any);
    const ctx: any = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
    };

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });
});
