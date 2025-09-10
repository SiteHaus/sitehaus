import { type Response } from 'express';

export const REFRESH_COOKIE = 'sh_refresh';

export const setRefreshCookie = (
  res: Response,
  token: string,
  expires: Date,
) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    path: '/',
    expires,
  });
};

export const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    path: '/',
  });
};
