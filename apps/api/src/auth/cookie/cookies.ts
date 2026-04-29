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
  return isProd ? 'none' : 'lax';
};

/** Sanitize a client key for use as a cookie name suffix (alphanum + underscore only). */
const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9_]/g, '_');

/**
 * Returns the cookie name for a given client key.
 * Per-client cookies prevent apps from clobbering each other's sessions
 * while still allowing SSO via /auth/authorize (which accepts any sh_refresh* cookie).
 */
export const getRefreshCookieName = (clientKey?: string) =>
  clientKey ? `${REFRESH_COOKIE}_${sanitizeKey(clientKey)}` : REFRESH_COOKIE;

const cookieOptions = (sameSite: 'strict' | 'lax' | 'none', expires: Date) => ({
  httpOnly: true,
  secure: isProd || sameSite === 'none',
  sameSite,
  path: '/',
  expires,
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
});

export const setRefreshCookie = (
  res: Response,
  token: string,
  expires: Date,
  clientKey?: string,
) => {
  const sameSite = getSameSite();
  res.cookie(
    getRefreshCookieName(clientKey),
    token,
    cookieOptions(sameSite, expires),
  );
};

export const clearRefreshCookie = (res: Response, clientKey?: string) => {
  const sameSite = getSameSite();
  res.clearCookie(getRefreshCookieName(clientKey), {
    httpOnly: true,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  });
};

/** Clear all sh_refresh* cookies found in the request (used on account deletion). */
export const clearAllRefreshCookies = (
  res: Response,
  cookies: Record<string, string>,
) => {
  const sameSite = getSameSite();
  const opts = {
    httpOnly: true,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
  };
  Object.keys(cookies)
    .filter(
      (name) =>
        name === REFRESH_COOKIE || name.startsWith(`${REFRESH_COOKIE}_`),
    )
    .forEach((name) => res.clearCookie(name, opts));
};

/**
 * Find the first sh_refresh* cookie value from the request.
 * Used by /auth/authorize to support SSO across all client apps.
 */
export const findAnyRefreshCookie = (
  cookies: Record<string, string> | undefined,
): string | undefined => {
  if (!cookies) return undefined;
  // Prefer the legacy sh_refresh for backward compat, then any per-client cookie.
  return (
    cookies[REFRESH_COOKIE] ??
    Object.entries(cookies).find(([name]) =>
      name.startsWith(`${REFRESH_COOKIE}_`),
    )?.[1]
  );
};
