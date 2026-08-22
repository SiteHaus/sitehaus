import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { IS_PUBLIC_KEY } from 'src/public.decorator';
import { BillingInternalController } from './billing-internal.controller';
import { BillingService } from './billing.service';

describe('BillingInternalController', () => {
  let controller: BillingInternalController;
  let billing: { ensureStripeCustomer: jest.Mock };

  beforeEach(async () => {
    billing = { ensureStripeCustomer: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [BillingInternalController],
      providers: [
        { provide: BillingService, useValue: billing },
        // ServiceKeyGuard is bound via @UseGuards on the controller, so Nest's
        // DI eagerly instantiates it while compiling this testing module even
        // though these tests call controller methods directly and never
        // exercise the guard itself — it still needs a resolvable ConfigService.
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'test-secret' },
        },
      ],
    }).compile();
    controller = moduleRef.get(BillingInternalController);
  });

  // The global AccessGuard (APP_GUARD) runs before any route-level guard and
  // 401s a request with no bearer token. This is a service-to-service call
  // authenticating with x-service-key, so without @Public() ServiceKeyGuard
  // never even runs and the cross-repo billing lookup always fails.
  it('is exempt from the global user-auth guard', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, BillingInternalController)).toBe(
      true,
    );
  });

  it('returns the stripeCustomerId, creating one if the client never had one', async () => {
    billing.ensureStripeCustomer.mockResolvedValue('cus_123');
    const result = await controller.getStripeCustomer('client-1');
    expect(billing.ensureStripeCustomer).toHaveBeenCalledWith('client-1');
    expect(result).toEqual({ stripeCustomerId: 'cus_123' });
  });

  it('returns null when the client does not exist at all', async () => {
    billing.ensureStripeCustomer.mockResolvedValue(null);
    const result = await controller.getStripeCustomer('missing');
    expect(result).toEqual({ stripeCustomerId: null });
  });
});
