import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceKeyGuard } from './service-key.guard';

const VALID_SECRET = 'a-sufficiently-long-service-secret';

function ctxWithHeader(header: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-service-key': header } }),
    }),
  } as unknown as ExecutionContext;
}

function guardWithSecret(secret: string) {
  return new ServiceKeyGuard({
    getOrThrow: () => secret,
  } as unknown as ConfigService);
}

describe('ServiceKeyGuard', () => {
  const guard = guardWithSecret(VALID_SECRET);

  it('allows a request with the correct key', () => {
    expect(guard.canActivate(ctxWithHeader(VALID_SECRET))).toBe(true);
  });

  it('rejects a missing key', () => {
    expect(guard.canActivate(ctxWithHeader(undefined))).toBe(false);
  });

  it('rejects a wrong key of the same length', () => {
    expect(
      guard.canActivate(ctxWithHeader('b-sufficiently-long-service-secret')),
    ).toBe(false);
  });

  it('rejects a wrong key of a different length', () => {
    expect(guard.canActivate(ctxWithHeader('wrong'))).toBe(false);
  });

  // getOrThrow only throws on a *missing* var. `COMMERCE_SERVICE_KEY=` (exactly
  // what .env.example ships) is a valid empty value, so without an explicit
  // check the guard would fail open for anyone sending an empty header.
  it('refuses everything when the configured key is empty', () => {
    const emptyGuard = guardWithSecret('');
    expect(emptyGuard.canActivate(ctxWithHeader(''))).toBe(false);
    expect(emptyGuard.canActivate(ctxWithHeader(undefined))).toBe(false);
  });

  it('refuses everything when the configured key is implausibly short', () => {
    const shortGuard = guardWithSecret('short');
    expect(shortGuard.canActivate(ctxWithHeader('short'))).toBe(false);
  });
});
