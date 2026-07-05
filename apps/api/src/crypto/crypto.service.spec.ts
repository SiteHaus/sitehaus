import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  // CryptoService derives an encryption key from the JWT secret; the methods
  // exercised here don't use it, so a stub secret is sufficient.
  const c = new CryptoService({ secret: Buffer.from('test-secret') } as never);

  it('randomIdOfLength returns at-least requested length', () => {
    const s = c.randomIdOfLength(96);
    expect(s).toHaveLength(96);
    expect(/^[A-Za-z0-9\-_]+$/.test(s)).toBe(true);
  });

  it('sha256b64url produces stable known value', () => {
    expect(c.sha256b64url('abc')).toBe(
      'ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0',
    );
  });

  it('hashPassword/verifypassword round-trip', async () => {
    const h = await c.hashPassword('s3cret!');
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await c.verifyPassword(h, 's3cret!')).toBe(true);
    expect(await c.verifyPassword(h, 'nope')).toBe(false);
  });

  it('safeEqual is constant-time-ish and requires same length', () => {
    expect(c.safeEqual('abcd', 'abcd')).toBe(true);
    expect(c.safeEqual('abcd', 'abce')).toBe(false);
    expect(c.safeEqual('abcd', 'abc')).toBe(false);
  });
});
