import { type Response } from 'express';

const isProd = process.env.NODE_ENV === 'production';

export const REFRESH_COOKIE = 'sh_refresh';

const getSameSite = (): 'strict' | 'lax' | 'none' => {
  const sameSite = process.env.COOKIE_SAME_SITE as
    | 'strict'
    | 'lax'
    | 'none'
    | undefined;
  if (sameSite) return sameSite;
  // Default to 'lax' for development, 'none' for production (cross-origin OAuth)
  return isProd ? 'none' : 'lax';
};

export const setRefreshCookie = (
  res: Response,
  token: string,
  expires: Date,
) => {
  const sameSite = getSameSite();

  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
    expires,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
};

export const clearRefreshCookie = (res: Response) => {
  const sameSite = getSameSite();

  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
};
