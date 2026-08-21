import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServiceKeyGuard } from './service-key.guard';

function ctxWithHeader(header: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { 'x-service-key': header } }),
    }),
  } as unknown as ExecutionContext;
}

describe('ServiceKeyGuard', () => {
  const config = {
    getOrThrow: () => 'correct-secret',
  } as unknown as ConfigService;
  const guard = new ServiceKeyGuard(config);

  it('allows a request with the correct key', () => {
    expect(guard.canActivate(ctxWithHeader('correct-secret'))).toBe(true);
  });

  it('rejects a missing key', () => {
    expect(guard.canActivate(ctxWithHeader(undefined))).toBe(false);
  });

  it('rejects a wrong key', () => {
    expect(guard.canActivate(ctxWithHeader('wrong'))).toBe(false);
  });
});
