import { jest } from '@jest/globals';
import { type Response } from 'express';
import {
  clearAllRefreshCookies,
  clearRefreshCookie,
  findAnyRefreshCookie,
  getRefreshCookieName,
} from './cookies';

function mockRes() {
  return { clearCookie: jest.fn() } as unknown as Response & {
    clearCookie: jest.Mock;
  };
}

describe('getRefreshCookieName', () => {
  it('returns the legacy name without a client key', () =>
    expect(getRefreshCookieName()).toBe('sh_refresh'));
  it('suffixes and sanitizes the client key', () =>
    expect(getRefreshCookieName('my-app!')).toBe('sh_refresh_my_app_'));
});

describe('findAnyRefreshCookie', () => {
  it('prefers a per-client cookie over the legacy one', () =>
    expect(
      findAnyRefreshCookie({ sh_refresh: 'old', sh_refresh_iam: 'new' }),
    ).toBe('new'));
  it('falls back to the legacy cookie', () =>
    expect(findAnyRefreshCookie({ sh_refresh: 'old' })).toBe('old'));
  it('returns undefined with no cookies', () =>
    expect(findAnyRefreshCookie(undefined)).toBeUndefined());
});

describe('clearRefreshCookie', () => {
  const OLD_DOMAIN = process.env.COOKIE_DOMAIN;
  afterEach(() => {
    if (OLD_DOMAIN === undefined) delete process.env.COOKIE_DOMAIN;
    else process.env.COOKIE_DOMAIN = OLD_DOMAIN;
  });

  it('clears both the host-only and domain-scoped variants when COOKIE_DOMAIN is set', () => {
    process.env.COOKIE_DOMAIN = '.staging.example.com';
    const res = mockRes();
    clearRefreshCookie(res, 'iam');

    const calls = res.clearCookie.mock.calls as [string, { domain?: string }][];
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toBe('sh_refresh_iam');
    expect(calls[0][1].domain).toBeUndefined();
    expect(calls[1][0]).toBe('sh_refresh_iam');
    expect(calls[1][1].domain).toBe('.staging.example.com');
  });

  it('clears the legacy name when no client key is given', () => {
    delete process.env.COOKIE_DOMAIN;
    const res = mockRes();
    clearRefreshCookie(res);

    const calls = res.clearCookie.mock.calls as [string][];
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('sh_refresh');
  });
});

describe('clearAllRefreshCookies', () => {
  it('clears every sh_refresh* cookie present and nothing else', () => {
    delete process.env.COOKIE_DOMAIN;
    const res = mockRes();
    clearAllRefreshCookies(res, {
      sh_refresh: 'a',
      sh_refresh_iam: 'b',
      sh_refresh_dashboard: 'c',
      other_cookie: 'd',
    });

    const cleared = (res.clearCookie.mock.calls as [string][]).map((c) => c[0]);
    expect(cleared.sort()).toEqual([
      'sh_refresh',
      'sh_refresh_dashboard',
      'sh_refresh_iam',
    ]);
  });
});
