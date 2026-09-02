import { jest } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { SessionService } from './session.service';

const USER_ID = 'user-1';
const CLIENT_ID = 'client-1';
const DEVICE_ID = 'device-1';

function makeTx(claimedRows: unknown[], insertedRow: unknown) {
  const whereResult: any = Promise.resolve(undefined);
  whereResult.returning = jest.fn().mockResolvedValue(claimedRows);

  const updateWhere = jest.fn().mockReturnValue(whereResult);
  const updateSet = jest.fn().mockReturnValue({ where: updateWhere });
  const update = jest.fn().mockReturnValue({ set: updateSet });

  const insertReturning = jest.fn().mockResolvedValue([insertedRow]);
  const insertValues = jest
    .fn()
    .mockReturnValue({ returning: insertReturning });
  const insert = jest.fn().mockReturnValue({ values: insertValues });

  const findFirst = jest.fn().mockResolvedValue(undefined);

  return {
    tx: {
      update,
      insert,
      query: { sessionsTable: { findFirst } },
    } as any,
    update,
    findFirst,
  };
}

function makeService(txBuilder: () => ReturnType<typeof makeTx>) {
  const crypto = {
    sha256b64url: jest.fn((s: string) => `hash:${s}`),
    randomIdOfLength: jest.fn(() => 'new-plaintext-token'),
  };
  const devices = {
    resolveOrCreateForSession: jest.fn().mockResolvedValue(DEVICE_ID),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const cfg = { refreshTtlSec: 2_592_000 };

  let lastTx: ReturnType<typeof makeTx> | undefined;
  const db = {
    transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      lastTx = txBuilder();
      return cb(lastTx.tx);
    }),
  };

  const service = new SessionService(
    db as any,
    crypto as any,
    devices as any,
    audit as any,
    cfg as any,
  );

  return { service, crypto, devices, db, getLastTx: () => lastTx! };
}

const activeRow = {
  id: 'session-old',
  userId: USER_ID,
  clientId: CLIENT_ID,
  mfaVerifiedAt: null,
};

describe('SessionService.rotate', () => {
  it('claims the active session and returns a freshly rotated token', async () => {
    let call = 0;
    const { service, getLastTx } = makeService(() =>
      makeTx([activeRow], { id: `session-new-${++call}` }),
    );

    const result = await service.rotate({
      refreshToken: 'plaintext-old',
      clientId: CLIENT_ID,
    });

    expect(result.userId).toBe(USER_ID);
    expect(result.refreshToken).toBe('new-plaintext-token');
    // The atomic claim, plus createSessionWith's own device-scoped revoke.
    expect(getLastTx().update).toHaveBeenCalledTimes(2);
  });

  it('hands back the winner result to a same-instant duplicate instead of nuking sessions', async () => {
    let call = 0;
    const { service, getLastTx } = makeService(() =>
      call === 0
        ? makeTx([activeRow], { id: 'session-new' })
        : makeTx([], undefined),
    );

    const first = await (async () => {
      call = 0;
      return service.rotate({
        refreshToken: 'plaintext-old',
        clientId: CLIENT_ID,
      });
    })();
    call = 1;

    const second = await service.rotate({
      refreshToken: 'plaintext-old',
      clientId: CLIENT_ID,
    });

    expect(second).toEqual(first);
    // The loser's tx: 1 failed claim attempt, no revoke-all, no reuse lookup.
    expect(getLastTx().update).toHaveBeenCalledTimes(1);
    expect(getLastTx().findFirst).not.toHaveBeenCalled();
  });

  it('revokes every session for the user+client when a truly revoked token is replayed', async () => {
    const { service, getLastTx } = makeService(() => {
      const built = makeTx([], undefined);
      built.findFirst.mockResolvedValue({
        userId: USER_ID,
        clientId: CLIENT_ID,
        revokedAt: new Date(),
      });
      return built;
    });

    await expect(
      service.rotate({
        refreshToken: 'stale-attacker-replay',
        clientId: CLIENT_ID,
      }),
    ).rejects.toThrow(UnauthorizedException);

    // 1 failed claim attempt + 1 revoke-all update.
    expect(getLastTx().update).toHaveBeenCalledTimes(2);
  });

  it('rejects an unknown token without touching any session rows beyond the claim attempt', async () => {
    const { service, getLastTx } = makeService(() => makeTx([], undefined));

    await expect(
      service.rotate({ refreshToken: 'never-issued', clientId: CLIENT_ID }),
    ).rejects.toThrow(UnauthorizedException);

    expect(getLastTx().update).toHaveBeenCalledTimes(1);
  });
});
