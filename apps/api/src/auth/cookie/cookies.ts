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
  const base = {
    httpOnly: true,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
  };
  const name = getRefreshCookieName(clientKey);
  // Clear both attribute variants: a cookie can only be deleted with the same
  // Domain it was set with, and browsers may still hold host-only strays from
  // deployments that predate COOKIE_DOMAIN. A stray that survives clearing is
  // replayed forever and trips refresh-token reuse detection on every visit.
  res.clearCookie(name, base);
  if (process.env.COOKIE_DOMAIN) {
    res.clearCookie(name, { ...base, domain: process.env.COOKIE_DOMAIN });
  }
};

/** Clear all sh_refresh* cookies found in the request (used on account deletion). */
export const clearAllRefreshCookies = (
  res: Response,
  cookies: Record<string, string>,
) => {
  const sameSite = getSameSite();
  const base = {
    httpOnly: true,
    secure: isProd || sameSite === 'none',
    sameSite,
    path: '/',
  };
  Object.keys(cookies)
    .filter(
      (name) =>
        name === REFRESH_COOKIE || name.startsWith(`${REFRESH_COOKIE}_`),
    )
    .forEach((name) => {
      // Both attribute variants — see clearRefreshCookie.
      res.clearCookie(name, base);
      if (process.env.COOKIE_DOMAIN) {
        res.clearCookie(name, { ...base, domain: process.env.COOKIE_DOMAIN });
      }
    });
};

/**
 * Find the first sh_refresh* cookie value from the request.
 * Used by /auth/authorize to support SSO across all client apps.
 */
export const findAnyRefreshCookie = (
  cookies: Record<string, string> | undefined,
): string | undefined => {
  if (!cookies) return undefined;
  // Prefer per-client cookies — they're more recent and specific. The legacy
  // sh_refresh session may have been revoked when a per-client cookie was issued
  // (createSession revokes existing sessions for the same user/client/device),
  // so preferring it would cause authorize to see a revoked token and loop back
  // to login even when sh_refresh_<key> is valid.
  const perClient = Object.entries(cookies).find(([name]) =>
    name.startsWith(`${REFRESH_COOKIE}_`),
  )?.[1];
  return perClient ?? cookies[REFRESH_COOKIE];
};
