import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { DRIZZLE } from 'src/db/tokens';
import { IS_PUBLIC_KEY } from 'src/public.decorator';
import { AccessGuard, AccessPayload } from './access.guard';

describe('AccessGuard', () => {
  const jwt = { verifyAsync: jest.fn<Promise<AccessPayload>, any[]>() };
  const db = { query: { sessionsTable: { findFirst: jest.fn() } } };

  const ctxWith = (auth?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: auth ? { authorization: auth } : {} }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => jest.resetAllMocks());

  it('works', async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AccessGuard,
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();

    const guard = mod.get(AccessGuard);

    await expect(guard.canActivate(ctxWith())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    jwt.verifyAsync.mockRejectedValueOnce(new Error('bad'));

    await expect(
      guard.canActivate(ctxWith('Bearer nope')),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    jwt.verifyAsync.mockResolvedValueOnce({
      sub: 'u1',
      sid: 's1',
      aud: 'c1',
      iat: 1,
      exp: 9_999_999_999,
    });

    (db.query.sessionsTable.findFirst as jest.Mock).mockResolvedValueOnce(null);
    await expect(
      guard.canActivate(ctxWith('Bearer ok')),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    jwt.verifyAsync.mockResolvedValueOnce({
      sub: 'u1',
      sid: 's1',
      aud: 'c1',
      iat: 1,
      exp: 9_999_999_999,
    });

    (db.query.sessionsTable.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 's1',
    });
    await expect(guard.canActivate(ctxWith('Bearer ok'))).resolves.toBe(true);
  });

  it('sets req.user on success', async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AccessGuard,
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();
    const guard = mod.get(AccessGuard);

    const payload: AccessPayload = {
      sub: 'u1',
      sid: 's1',
      aud: 'c1',
      iat: 1,
      exp: 9_999_999_999,
    };

    jwt.verifyAsync.mockResolvedValueOnce(payload);
    (db.query.sessionsTable.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 's1',
    });

    const req: any = { headers: { authorization: 'Bearer ok' } };
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ userId: 'u1', clientId: 'c1', sessionId: 's1' });
  });

  it('bypasses when route is @Public()', async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AccessGuard,
        Reflector,
        { provide: JwtService, useValue: jwt },
        { provide: DRIZZLE, useValue: db },
      ],
    }).compile();
    const guard = mod.get(AccessGuard);

    const handler = () => {};
    Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);

    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      getHandler: () => handler,
      getClass: () => ({}),
    };

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
  });
});
