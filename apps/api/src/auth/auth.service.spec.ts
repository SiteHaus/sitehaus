import { jest } from '@jest/globals';
import type { ConfigType } from '@nestjs/config';
import type { Db } from '@site-haus/db';
import type { AuditService } from 'src/audit/audit.service';
import type authConfig from 'src/conf/auth.config';
import type { CryptoService } from 'src/crypto/crypto.service';
import type { RolesService } from 'src/roles/roles.service';
import type { SessionService } from 'src/session/session.service';
import type { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import type { TokenService } from './token/token.service';
import type { TotpService } from './totp/totp.service';

const USER_ID = 'user-1';
const CTX = { clientId: 'client-1', ip: '127.0.0.1', ua: 'jest' };

function makeService(opts: { has2fa: boolean }) {
  const isEnabled = jest.fn(async () => opts.has2fa);
  const totp = { isEnabled } as unknown as TotpService;

  const log = jest.fn(async () => undefined);
  const audit = { log } as unknown as AuditService;

  const createSession = jest.fn(async () => ({
    sessionId: 'session-1',
    refreshToken: 'refresh-token',
    refreshExpiresAt: new Date('2026-01-01T00:00:00Z'),
  }));
  const sessions = { createSession } as unknown as SessionService;

  const signAccessToken = jest.fn(async () => 'access-token');
  const tokens = { signAccessToken } as unknown as TokenService;

  const cfg = { accessTtlSec: 900 } as ConfigType<typeof authConfig>;

  const service = new AuthService(
    {} as unknown as UsersService,
    {} as unknown as CryptoService,
    sessions,
    tokens,
    {} as unknown as RolesService,
    totp,
    audit,
    cfg,
    {} as Db,
  );

  return { service, isEnabled, log, createSession, signAccessToken };
}

describe('AuthService.issueTokensForOTP — F-041', () => {
  it('issues an mfa-pending token and skips the login audit log when 2FA is enabled', async () => {
    const { service, isEnabled, log, signAccessToken } = makeService({
      has2fa: true,
    });

    const result = await service.issueTokensForOTP(USER_ID, CTX);

    expect(isEnabled).toHaveBeenCalledWith(USER_ID);
    expect(result.requires2FA).toBe(true);
    expect(signAccessToken.mock.calls[0][0]).toMatchObject({ mfa: 'pending' });
    expect(log).not.toHaveBeenCalled();
  });

  it('issues a full token and logs a login audit event when 2FA is disabled', async () => {
    const { service, isEnabled, log, signAccessToken } = makeService({
      has2fa: false,
    });

    const result = await service.issueTokensForOTP(USER_ID, CTX);

    expect(isEnabled).toHaveBeenCalledWith(USER_ID);
    expect(result.requires2FA).toBe(false);
    expect(signAccessToken.mock.calls[0][0]).toMatchObject({ mfa: undefined });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        action: 'user.login',
        clientId: CTX.clientId,
      }),
    );
  });

  it('still returns a refresh token when 2FA is enabled (a real session backs the pending state)', async () => {
    const { service } = makeService({ has2fa: true });

    const result = await service.issueTokensForOTP(USER_ID, CTX);

    expect(result.refreshToken).toBe('refresh-token');
    expect(result.sessionId).toBe('session-1');
  });
});
