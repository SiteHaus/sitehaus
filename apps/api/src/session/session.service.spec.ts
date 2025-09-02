import { UnauthorizedException } from '@nestjs/common';
import { CryptoService } from 'src/auth/crypto/crypto.service';
import { SessionService } from './session.service';

describe('SessionService.rotate (simple stubs)', () => {
  const crypto = new CryptoService();
  const cfg = { refreshTtlSec: 3600 } as any;

  const makeDb = (seed: any[] = []) => {
    const sessions = [...seed];

    let lastFound: any | null = null;

    const query = {
      sessionsTable: {
        findFirst: jest.fn(async ({}: any) => {
          return lastFound ?? null;
        }),
      },
    };

    const insert = () => ({
      values: (row: any) => ({
        returning: (_shape?: any) => {
          const id = row.id ?? `sess_${Math.random().toString(36).slice(2)}`;
          const newRow = {
            id,
            createdAt: new Date(),
            lastUsedAt: new Date(),
            revokedAt: null,
            meta: {},
            ...row,
          };
          sessions.push(newRow);
          return [{ id }];
        },
      }),
    });

    const update = () => ({
      set: (patch: any) => ({
        where: (_cond: any) => {
          if (lastFound) Object.assign(lastFound, patch);
          return {
            returning: (_sel?: any) =>
              lastFound ? [{ id: lastFound.id }] : [],
          };
        },
      }),
    });

    const tx = {
      query,
      insert,
      update,
      transaction: async (fn: any) => fn(tx),
    };

    const db = { ...tx };

    return {
      db: db as any,
      sessions,
      setFindFirstNext: (row: any) => {
        (query.sessionsTable.findFirst as jest.Mock).mockImplementationOnce(
          async () => {
            lastFound = row;
            return row;
          },
        );
      },
      clearLastFound: () => {
        lastFound = null;
      },
    };
  };

  const hash = (t: string) => crypto.sha256b64url(t);

  it('rotates a valid refresh (revokes old, creates new)', async () => {
    const old = {
      id: 's1',
      userId: 'u1',
      clientId: 'c1',
      refreshHash: hash('rtok_1'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const { db, sessions, setFindFirstNext } = makeDb([old]);

    setFindFirstNext(old);

    const svc = new SessionService(db, crypto, cfg);
    const out = await svc.rotate({ refreshToken: 'rtok_1', clientId: 'c1' });

    const afterOld = sessions.find((s) => s.id === 's1');
    expect(afterOld?.revokedAt).not.toBeNull();

    expect(out.userId).toBe('u1');
    expect(out.sessionId).toBeDefined();
    expect(out.refreshToken).toBeDefined();
    const newest = sessions.find((s) => s.id !== 's1');
    expect(newest?.clientId).toBe('c1');
    expect(newest?.refreshHash).toBe(hash(out.refreshToken));
  });

  it('rejects invalid token (no match, no reuse)', async () => {
    const { db } = makeDb();
    const svc = new SessionService(db, crypto, cfg);

    await expect(
      svc.rotate({ refreshToken: 'nope', clientId: 'c1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('reused (revoked) token → revoke-all for that client and throw', async () => {
    const reused = {
      id: 's2',
      userId: 'u2',
      clientId: 'cA',
      refreshHash: hash('stolen'),
      revokedAt: new Date(), // already revoked → reuse
      expiresAt: new Date(Date.now() + 60_000),
    };
    const stillActive = {
      id: 's3',
      userId: 'u2',
      clientId: 'cA',
      refreshHash: hash('another'),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    };

    const { db, sessions, setFindFirstNext, clearLastFound } = makeDb([
      reused,
      stillActive,
    ]);

    setFindFirstNext(null);
    setFindFirstNext(reused);

    const revokeSpy = jest.spyOn(
      SessionService.prototype as any,
      'revokeAllForUserClientInTx',
    ) as jest.SpyInstance<Promise<void>, [unknown, string, string]>;

    revokeSpy.mockImplementation(async (...args) => {
      const [, userId, clientId] = args as [unknown, string, string];
      const now = new Date();
      for (const s of sessions) {
        if (
          s.userId === userId &&
          s.clientId === clientId &&
          s.revokedAt == null &&
          s.expiresAt > now
        ) {
          s.revokedAt = now;
        }
      }
    });

    const svc = new SessionService(db, crypto, cfg);
    await expect(
      svc.rotate({ refreshToken: 'stolen', clientId: 'cA' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const affected = sessions.filter(
      (s) => s.userId === 'u2' && s.clientId === 'cA',
    );
    expect(affected.length).toBeGreaterThan(0);
    expect(affected.every((s) => s.revokedAt != null)).toBe(true);

    (
      SessionService.prototype as any
    ).revokeAllForUserClientInTx.mockRestore?.();
    clearLastFound();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });
});
