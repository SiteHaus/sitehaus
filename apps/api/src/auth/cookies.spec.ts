import {
  clearRefreshCookie,
  REFRESH_COOKIE,
  setRefreshCookie,
} from './cookies';

const mkRes = () => {
  const jar: any[] = [];
  return {
    cookie: (...args: any[]) => {
      jar.push(args);
      return {} as any;
    },
    clearCookie: (...args: any[]) => {
      jar.push(['clear', ...args]);
      return {} as any;
    },
    _jar: jar,
  } as any;
};

describe('cookies helpers', () => {
  const realEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = realEnv;
  });

  it('setRefreshCookie sets httpOnly, sameSite, secure in prod', () => {
    process.env.NODE_ENV = 'production';
    const res = mkRes();
    const exp = new Date(Date.now() + 3600e3);
    setRefreshCookie(res, 'rt', exp);
    const [name, value, opts] = res._jar[0];
    expect(name).toBe(REFRESH_COOKIE);
    expect(value).toBe('rt');
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
    expect(opts.secure).toBe(true);
    expect(new Date(opts.expires).getTime()).toBeCloseTo(exp.getTime(), -2);
  });

  it('clearRefreshCookie clears', () => {
    const res = mkRes();
    clearRefreshCookie(res);
    const [, name, _opts] = res._jar[0];
    expect(name).toBe(REFRESH_COOKIE);
  });
});
