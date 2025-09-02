import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import authConfig from 'src/conf/auth.config';
import { UserExistsError } from 'src/errors/auth.errors';
import { SessionService } from 'src/session/session.service';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto/crypto.service';
import { TokenService } from './token/token.service';

describe('AuthService', () => {
  const users = {
    createUserWithPassword: jest.fn(),
    findByEmail: jest.fn(),
    getPasswordCredential: jest.fn(),
  };
  const crypto = {
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
  };
  const sessions = {
    createSession: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
  };
  const tokens = { signAccessToken: jest.fn() };

  const cfg = {
    alg: 'HS256' as const,
    secret: Buffer.from('test'),
    accessTtlSec: 300,
    refreshTtlSec: 3600,
  };

  let svc: AuthService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: CryptoService, useValue: crypto },
        { provide: SessionService, useValue: sessions },
        { provide: TokenService, useValue: tokens },
        { provide: authConfig.KEY, useValue: cfg },
      ],
    }).compile();

    svc = mod.get(AuthService);
  });

  it('register → hashes password, creates user, mints tokens', async () => {
    crypto.hashPassword.mockResolvedValueOnce('argonHash');
    users.createUserWithPassword.mockResolvedValueOnce({ id: 'u1' });
    sessions.createSession.mockResolvedValueOnce({
      sessionId: 's1',
      refreshToken: 'rt',
      refreshExpiresAt: new Date(Date.now() + 3600e3),
    });
    tokens.signAccessToken.mockResolvedValueOnce('at');

    const out = await svc.register(
      {
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        password: 'pw',
      },
      { clientId: 'c1', ip: '1.2.3.4', ua: 'ua' },
    );

    expect(crypto.hashPassword).toHaveBeenCalledWith('pw');
    expect(users.createUserWithPassword).toHaveBeenCalled();
    expect(sessions.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', clientId: 'c1' }),
    );
    expect(tokens.signAccessToken).toHaveBeenCalledWith(
      { sub: 'u1', sid: 's1', aud: 'c1' },
      { expiresInSec: cfg.accessTtlSec },
    );
    expect(out).toMatchObject({
      accessToken: 'at',
      sessionId: 's1',
      userId: 'u1',
    });
  });

  it('register → conflict maps to ConflictException', async () => {
    crypto.hashPassword.mockResolvedValueOnce('argonHash');
    users.createUserWithPassword.mockRejectedValueOnce(
      new UserExistsError('a@b.com'),
    );

    await expect(
      svc.register(
        { email: 'a@b.com', firstName: 'A', lastName: 'B', password: 'pw' },
        { clientId: 'c1' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login → success', async () => {
    users.findByEmail.mockResolvedValueOnce({ id: 'u1' });
    users.getPasswordCredential.mockResolvedValueOnce({ passwordHash: 'h' });
    crypto.verifyPassword.mockResolvedValueOnce(true);
    sessions.createSession.mockResolvedValueOnce({
      sessionId: 's1',
      refreshToken: 'rt',
      refreshExpiresAt: new Date(Date.now() + 3600e3),
    });
    tokens.signAccessToken.mockResolvedValueOnce('at');

    const out = await svc.login(
      { email: 'a@b.com', password: 'pw' },
      { clientId: 'c1' },
    );

    expect(out).toMatchObject({
      accessToken: 'at',
      sessionId: 's1',
      userId: 'u1',
    });
  });

  it('login → invalid email or password throws Unauthorized', async () => {
    users.findByEmail.mockResolvedValueOnce(null);
    await expect(
      svc.login({ email: 'x@z.com', password: 'pw' }, { clientId: 'c1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    users.findByEmail.mockResolvedValueOnce({ id: 'u1' });
    users.getPasswordCredential.mockResolvedValueOnce(null);
    await expect(
      svc.login({ email: 'x@z.com', password: 'pw' }, { clientId: 'c1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    users.findByEmail.mockResolvedValueOnce({ id: 'u1' });
    users.getPasswordCredential.mockResolvedValueOnce({ passwordHash: 'h' });
    crypto.verifyPassword.mockResolvedValueOnce(false);
    await expect(
      svc.login({ email: 'x@z.com', password: 'pw' }, { clientId: 'c1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh → rotates and signs new access token', async () => {
    sessions.rotate.mockResolvedValueOnce({
      userId: 'u1',
      sessionId: 's2',
      refreshToken: 'rt2',
      refreshExpiresAt: new Date(Date.now() + 3600e3),
    });
    tokens.signAccessToken.mockResolvedValueOnce('at2');

    const out = await svc.refresh({ clientId: 'c1', refreshToken: 'rt' });

    expect(sessions.rotate).toHaveBeenCalled();
    expect(tokens.signAccessToken).toHaveBeenCalledWith(
      { sub: 'u1', sid: 's2', aud: 'c1' },
      { expiresInSec: cfg.accessTtlSec },
    );
    expect(out).toMatchObject({ accessToken: 'at2', sessionId: 's2' });
  });

  it('logoutBySid → calls sessions.revoke', async () => {
    await svc.logoutBySid('s1');
    expect(sessions.revoke).toHaveBeenCalledWith('s1');
  });
});
