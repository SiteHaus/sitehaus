import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { REFRESH_COOKIE } from './cookies';

const getSetCookie = (res: request.Response): string => {
  const raw = res.header['set-cookie'] as string[] | string | undefined;
  return Array.isArray(raw) ? raw.join(';') : (raw ?? '');
};

describe('AuthController (e2e, mocked service)', () => {
  let app: INestApplication;
  const auth = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logoutBySid: jest.fn(),
  };

  class AllowGuard {
    canActivate(context: any) {
      const req = context.switchToHttp().getRequest();
      req.user ??= { userId: 'u1', clientId: 'c1', sessionId: 's1' };
      return true;
    }
  }

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: APP_GUARD, useClass: AllowGuard },
      ],
    }).compile();

    app = mod.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  beforeEach(() => jest.resetAllMocks());
  afterAll(async () => app.close());

  it('POST /auth/register sets refresh cookie + returns access payload', async () => {
    auth.register.mockResolvedValueOnce({
      accessToken: 'at',
      accessTokenExpiresIn: 300,
      refreshToken: 'rt',
      refreshTokenExpiresAt: new Date(Date.now() + 3600e3).toISOString(),
      sessionId: 's1',
      userId: 'u1',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .set('x-client-id', 'c1')
      .send({ email: 'a@b.com', firstName: 'A', lastName: 'B', password: 'x' })
      .expect(200);

    const setCookie = getSetCookie(res);
    expect(setCookie).toContain(`${REFRESH_COOKIE}=`);
    expect(setCookie).toMatch(/HttpOnly/i);

    expect(res.body.refreshToken).toBeUndefined();
    expect(res.body).toMatchObject({
      accessToken: 'at',
      accessTokenExpiresIn: 300,
      sessionId: 's1',
      userId: 'u1',
    });
  });

  it('POST /auth/login behaves like register', async () => {
    auth.login.mockResolvedValueOnce({
      accessToken: 'at2',
      accessTokenExpiresIn: 300,
      refreshToken: 'rt2',
      refreshTokenExpiresAt: new Date(Date.now() + 3600e3).toISOString(),
      sessionId: 's2',
      userId: 'u1',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .set('x-client-id', 'c1')
      .send({ email: 'a@b.com', password: 'x' })
      .expect(200);

    const setCookie = getSetCookie(res);
    expect(setCookie).toContain(`${REFRESH_COOKIE}=`);
    expect(res.body.refreshToken).toBeUndefined();
    expect(res.body).toMatchObject({ accessToken: 'at2', sessionId: 's2' });
  });

  it('POST /auth/refresh reads cookie and rotates', async () => {
    auth.refresh.mockResolvedValueOnce({
      accessToken: 'newAt',
      accessTokenExpiresIn: 300,
      refreshToken: 'newRt',
      refreshTokenExpiresAt: new Date(Date.now() + 3600e3).toISOString(),
      sessionId: 's3',
      userId: 'u1',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('x-client-id', 'c1')
      .set('Cookie', [`${REFRESH_COOKIE}=rt`])
      .expect(200);

    const setCookie = getSetCookie(res);
    expect(setCookie).toContain(`${REFRESH_COOKIE}=`);
    expect(res.body).toMatchObject({ accessToken: 'newAt', sessionId: 's3' });
  });

  it('POST /auth/refresh clears cookie on error', async () => {
    auth.refresh.mockRejectedValueOnce(new UnauthorizedException('nope'));

    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('x-client-id', 'c1')
      .set('Cookie', [`${REFRESH_COOKIE}=rt`])
      .expect(401);

    const setCookie = getSetCookie(res);
    expect(setCookie).toContain(`${REFRESH_COOKIE}=`);
    expect(/Expires=|Max-Age=0/i.test(setCookie)).toBe(true);
  });

  it('POST /auth/logout returns 204 + clears cookie + calls service', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(204);

    const setCookie = getSetCookie(res);
    expect(/Expires=|Max-Age=0/i.test(setCookie)).toBe(true);
    expect(auth.logoutBySid).toHaveBeenCalledWith('s1');
  });
});
