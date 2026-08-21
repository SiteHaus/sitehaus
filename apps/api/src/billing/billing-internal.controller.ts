import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ServiceKeyGuard } from './service-key.guard';

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
