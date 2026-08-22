import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { Public } from 'src/public.decorator';
import { BillingService } from './billing.service';
import { ServiceKeyGuard } from './service-key.guard';

// @Public() exempts this controller from the *global* AccessGuard (APP_GUARD in
// auth.module.ts), which runs before any route-level guard and 401s anything
// without a bearer token. This is a service-to-service call from
// sitehaus-commerce that authenticates with `x-service-key` and carries no user
// token, so without this the request never reaches ServiceKeyGuard at all —
// resolveBillingCustomerId sees the 401, returns null, and the merchant is stuck
// at billing_setup_required forever. ServiceKeyGuard, below, is still the real
// authorization for this route; @Public() only stands down the user-auth guard.
// Same pattern as StripeWebhookController.
@Public()
@UseGuards(ServiceKeyGuard)
@Controller('clients/:clientId/billing')
export class BillingInternalController {
  constructor(private readonly billing: BillingService) {}

  // Get-or-create, not a bare read — a client that's never been billed for
  // anything in Dashboard still needs a Stripe customer to exist before
  // sitehaus-commerce can attach a postage-billing card to it. Reuses
  // BillingService's existing ensureStripeCustomer rather than duplicating
  // customer-creation logic.
  @Get('stripe-customer')
  async getStripeCustomer(@Param('clientId') clientId: string) {
    const stripeCustomerId = await this.billing.ensureStripeCustomer(clientId);
    return { stripeCustomerId: stripeCustomerId ?? null };
  }
}
