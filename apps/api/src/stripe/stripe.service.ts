import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import Stripe from 'stripe';
import stripeConfig from 'src/conf/stripe.config';

@Injectable()
export class StripeService {
  readonly client: Stripe;
  readonly dashboardUrl: string;
  private readonly webhookSecret: string;

  constructor(
    @Inject(stripeConfig.KEY)
    private readonly config: ConfigType<typeof stripeConfig>,
  ) {
    this.client = new Stripe(config.secretKey, {
      apiVersion: '2026-01-28.clover',
    });
    this.webhookSecret = config.webhookSecret;
    this.dashboardUrl = config.dashboardUrl;
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.client.webhooks.constructEvent(payload, signature, this.webhookSecret);
  }

  async getOrCreateCustomer(clientId: string, name: string, email?: string): Promise<Stripe.Customer> {
    const existing = await this.client.customers.search({
      query: `metadata['clientId']:'${clientId}'`,
    });
    if (existing.data.length > 0) return existing.data[0] as Stripe.Customer;

    return this.client.customers.create({
      name,
      ...(email ? { email } : {}),
      metadata: { clientId },
    });
  }

  async createPortalSession(stripeCustomerId: string, returnUrl: string): Promise<string> {
    const session = await this.client.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });
    return session.url;
  }

  async createSubscription(
    stripeCustomerId: string,
    amountCents: number,
    intervalMonths: number,
    productName: string,
  ): Promise<Stripe.Subscription> {
    const product = await this.client.products.create({ name: productName });

    return this.client.subscriptions.create({
      customer: stripeCustomerId,
      items: [
        {
          price_data: {
            currency: 'usd',
            product: product.id,
            recurring: { interval: 'month', interval_count: intervalMonths },
            unit_amount: amountCents,
          },
        },
      ],
      collection_method: 'send_invoice',
      days_until_due: 30,
      expand: ['latest_invoice'],
    });
  }

  async createOneTimeInvoice(
    stripeCustomerId: string,
    amountCents: number,
    description: string,
  ): Promise<Stripe.Invoice> {
    await this.client.invoiceItems.create({
      customer: stripeCustomerId,
      amount: amountCents,
      currency: 'usd',
      description,
    });

    const invoice = await this.client.invoices.create({
      customer: stripeCustomerId,
      auto_advance: true,
      pending_invoice_items_behavior: 'include',
    });
    return this.client.invoices.finalizeInvoice(invoice.id);
  }
}
