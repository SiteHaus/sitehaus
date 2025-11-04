import { type Response } from 'express';

const isProd = process.env.NODE_ENV === 'production';

export const REFRESH_COOKIE = 'sh_refresh';

export const setRefreshCookie = (
  res: Response,
  token: string,
  expires: Date,
) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    expires,
    ...(isProd && process.env.COOKIE_DOMAIN
      ? { domain: process.env.COOKIE_DOMAIN }
      : {}),
  });
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    ...(isProd && process.env.COOKIE_DOMAIN
      ? { domain: process.env.COOKIE_DOMAIN }
      : {}),
  });
};
