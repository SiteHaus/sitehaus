import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  or,
  schema,
  type Db,
  type BillingRecordStatus,
} from '@site-haus/db';
import type {
  CreateOneTimeInput,
  CreateSubscriptionInput,
  ListBillingQuery,
} from '@site-haus/validation/forms/billing';
import Stripe from 'stripe';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';
import { NotificationsService } from 'src/notifications/notifications.service';
import { StripeService } from 'src/stripe/stripe.service';

interface AuditContext {
  userId: string;
  clientId: string;
  ip?: string;
  ua?: string;
}

function serialise(row: typeof schema.billingRecordsTable.$inferSelect) {
  return {
    ...row,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class BillingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly stripe: StripeService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async ensureStripeCustomer(
    clientId: string,
    email?: string,
  ): Promise<string | null> {
    const client = await this.db.query.clientsTable.findFirst({
      where: eq(schema.clientsTable.id, clientId),
      columns: { id: true, name: true, stripeCustomerId: true },
    });
    if (!client) return null;

    const customer = await this.stripe.getOrCreateCustomer(
      client.id,
      client.name,
      email,
    );

    if (customer.id !== client.stripeCustomerId) {
      await this.db
        .update(schema.clientsTable)
        .set({ stripeCustomerId: customer.id })
        .where(eq(schema.clientsTable.id, clientId));
    }

    // If an email was provided and the customer doesn't have one yet, update it
    if (email && !customer.email) {
      await this.stripe.client.customers.update(customer.id, { email });
    }

    return customer.id;
  }

  async list(
    query: ListBillingQuery,
    requestingClientId: string,
    isFirstParty: boolean,
  ) {
    const conditions: ReturnType<typeof eq>[] = [];

    if (!isFirstParty) {
      conditions.push(
        eq(schema.billingRecordsTable.clientId, requestingClientId),
      );
    } else if (query.clientId) {
      conditions.push(eq(schema.billingRecordsTable.clientId, query.clientId));
    }

    if (query.projectId) {
      conditions.push(
        eq(schema.billingRecordsTable.projectId, query.projectId),
      );
    }
    if (query.status) {
      conditions.push(eq(schema.billingRecordsTable.status, query.status));
    }

    const rows = await this.db.query.billingRecordsTable.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(schema.billingRecordsTable.createdAt)],
    });

    return rows.map(serialise);
  }

  async getPortalUrl(
    requestingClientId: string,
  ): Promise<string | null | { error: string }> {
    const stripeCustomerId =
      await this.ensureStripeCustomer(requestingClientId);
    if (!stripeCustomerId) return null;

    const returnUrl = `${this.stripe.dashboardUrl}/billing`;
    return this.stripe.createPortalSession(stripeCustomerId, returnUrl);
  }

  async getAdminOverview() {
    const allRecords = await this.db.query.billingRecordsTable.findMany({
      with: { client: { columns: { id: true, name: true } } },
      orderBy: [desc(schema.billingRecordsTable.createdAt)],
    });

    const mrrCents = allRecords
      .filter((r) => r.type === 'recurring' && r.status === 'active')
      .reduce((sum, r) => sum + r.amountCents, 0);

    const totalRevenueCents = allRecords
      .filter((r) => r.type === 'one_time' && r.status === 'paid')
      .reduce((sum, r) => sum + r.amountCents, 0);

    const overdueRecords = allRecords.filter((r) => r.status === 'past_due');
    const overdueAmountCents = overdueRecords.reduce(
      (sum, r) => sum + r.amountCents,
      0,
    );

    const activeClientIds = new Set(
      allRecords
        .filter((r) => r.type === 'recurring' && r.status === 'active')
        .map((r) => r.clientId),
    );

    const clientMap = new Map<
      string,
      {
        name: string;
        mrrCents: number;
        totalPaidCents: number;
        status: BillingRecordStatus | null;
        lastPaymentAt: string | null;
      }
    >();

    for (const record of allRecords) {
      const entry = clientMap.get(record.clientId) ?? {
        name: record.client.name,
        mrrCents: 0,
        totalPaidCents: 0,
        status: null as BillingRecordStatus | null,
        lastPaymentAt: null as string | null,
      };

      if (record.type === 'recurring' && record.status === 'active') {
        entry.mrrCents += record.amountCents;
      }
      if (record.type === 'one_time' && record.status === 'paid') {
        entry.totalPaidCents += record.amountCents;
        const updatedAt = record.updatedAt?.toISOString() ?? null;
        if (
          !entry.lastPaymentAt ||
          (updatedAt && updatedAt > entry.lastPaymentAt)
        ) {
          entry.lastPaymentAt = updatedAt;
        }
      }
      if (record.status && !entry.status) entry.status = record.status;

      clientMap.set(record.clientId, entry);
    }

    const revenueByClient = Array.from(clientMap.entries()).map(
      ([clientId, data]) => ({
        clientId,
        clientName: data.name,
        mrrCents: data.mrrCents,
        totalPaidCents: data.totalPaidCents,
        status: data.status,
        lastPaymentAt: data.lastPaymentAt,
      }),
    );

    return {
      mrrCents,
      totalRevenueCents,
      overdueCount: overdueRecords.length,
      overdueAmountCents,
      activeClientCount: activeClientIds.size,
      revenueByClient,
      records: allRecords.map(serialise),
    };
  }

  async createSubscription(data: CreateSubscriptionInput, ctx: AuditContext) {
    const project = await this.db.query.projectsTable.findFirst({
      where: and(
        eq(schema.projectsTable.id, data.projectId),
        eq(schema.projectsTable.clientId, data.clientId),
      ),
      columns: { id: true, name: true },
    });
    if (!project) return { error: 'Project not found or access denied' };

    const stripeCustomerId = await this.ensureStripeCustomer(
      data.clientId,
      data.billingEmail,
    );
    if (!stripeCustomerId) return { error: 'Client not found' };

    const subscription = await this.stripe.createSubscription(
      stripeCustomerId,
      data.amountCents,
      data.intervalMonths,
      project.name,
    );

    // Grab the hosted invoice URL from the first invoice (if available)
    const latestInvoice = subscription.latest_invoice as
      | Record<string, unknown>
      | string
      | null;
    const hostedInvoiceUrl =
      typeof latestInvoice === 'object' && latestInvoice !== null
        ? ((latestInvoice['hosted_invoice_url'] as string | null) ?? null)
        : null;

    const [record] = await this.db
      .insert(schema.billingRecordsTable)
      .values({
        projectId: data.projectId,
        clientId: data.clientId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        type: 'recurring',
        amountCents: data.amountCents,
        currency: 'usd',
        status: 'active',
        intervalMonths: data.intervalMonths,
        hostedInvoiceUrl,
        currentPeriodStart: subscription.items.data[0]?.current_period_start
          ? new Date(subscription.items.data[0].current_period_start * 1000)
          : null,
        currentPeriodEnd: subscription.items.data[0]?.current_period_end
          ? new Date(subscription.items.data[0].current_period_end * 1000)
          : null,
      })
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'billing.subscription.created',
      targetType: 'project',
      targetId: data.projectId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { billingRecordId: record.id, amountCents: data.amountCents },
    });

    return serialise(record);
  }

  async createOneTime(data: CreateOneTimeInput, ctx: AuditContext) {
    const project = await this.db.query.projectsTable.findFirst({
      where: and(
        eq(schema.projectsTable.id, data.projectId),
        eq(schema.projectsTable.clientId, data.clientId),
      ),
      columns: { id: true, name: true },
    });
    if (!project) return { error: 'Project not found or access denied' };

    const stripeCustomerId = await this.ensureStripeCustomer(
      data.clientId,
      data.billingEmail,
    );
    if (!stripeCustomerId) return { error: 'Client not found' };

    const invoice = await this.stripe.createOneTimeInvoice(
      stripeCustomerId,
      data.amountCents,
      data.description ?? project.name,
    );

    const invoiceData = invoice as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const rawPi = invoiceData['payment_intent'];
    const piId = typeof rawPi === 'string' ? rawPi : (rawPi?.id ?? null);
    const [record] = await this.db
      .insert(schema.billingRecordsTable)
      .values({
        projectId: data.projectId,
        clientId: data.clientId,
        stripeCustomerId,
        stripePaymentIntentId: piId,
        type: 'one_time',
        amountCents: data.amountCents,
        currency: 'usd',
        status: 'active',
        hostedInvoiceUrl: invoiceData['hosted_invoice_url'] ?? null,
      })
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'billing.one_time.created',
      targetType: 'project',
      targetId: data.projectId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { billingRecordId: record.id, amountCents: data.amountCents },
    });

    return serialise(record);
  }

  async handleWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        // If cancel_at_period_end is set the client has cancelled — mark it
        // cancelled immediately rather than waiting for the deletion event
        const status = sub.cancel_at_period_end
          ? 'cancelled'
          : this.mapSubStatus(sub.status);
        const item = sub.items.data[0];
        await this.db
          .update(schema.billingRecordsTable)
          .set({
            status,
            currentPeriodStart: item?.current_period_start
              ? new Date(item.current_period_start * 1000)
              : null,
            currentPeriodEnd: item?.current_period_end
              ? new Date(item.current_period_end * 1000)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(schema.billingRecordsTable.stripeSubscriptionId, sub.id));
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.db
          .update(schema.billingRecordsTable)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(eq(schema.billingRecordsTable.stripeSubscriptionId, sub.id));
        break;
      }

      case 'invoice.paid': {
        // Use loose typing for invoice fields that vary between API versions
        const invoice = event.data.object as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        const hostedUrl = invoice['hosted_invoice_url'] ?? null;
        const rawSub =
          invoice['parent']?.['subscription_details']?.['subscription'];
        const subscriptionId =
          typeof rawSub === 'string' ? rawSub : (rawSub?.id ?? null);
        if (subscriptionId) {
          const [affected] = await this.db
            .update(schema.billingRecordsTable)
            .set({
              status: 'active',
              hostedInvoiceUrl: hostedUrl,
              updatedAt: new Date(),
            })
            .where(
              eq(
                schema.billingRecordsTable.stripeSubscriptionId,
                subscriptionId,
              ),
            )
            .returning({
              id: schema.billingRecordsTable.id,
              clientId: schema.billingRecordsTable.clientId,
              projectId: schema.billingRecordsTable.projectId,
              amountCents: schema.billingRecordsTable.amountCents,
            });
          if (affected) {
            await this.audit.log({
              clientId: affected.clientId,
              userId: null,
              action: 'billing.invoice.paid',
              targetType: 'project',
              targetId: affected.projectId ?? null,
              meta: {
                billingRecordId: affected.id,
                amountCents: affected.amountCents,
              },
            });
          }
        } else {
          // For send_invoice one-time payments, the PaymentIntent is only created
          // when the customer actually pays — so stripePaymentIntentId may be null
          // at record creation time. Match by paymentIntentId first, then fall back
          // to hostedInvoiceUrl (stable, unique per invoice).
          const rawPi = invoice['payment_intent'];
          const paymentIntentId =
            typeof rawPi === 'string' ? rawPi : (rawPi?.id ?? null);

          // OR both identifiers: PI ID for new records, hostedInvoiceUrl as
          // fallback for older records where PI ID wasn't stored correctly.
          const orClauses = [
            ...(paymentIntentId
              ? [
                  eq(
                    schema.billingRecordsTable.stripePaymentIntentId,
                    paymentIntentId,
                  ),
                ]
              : []),
            ...(hostedUrl
              ? [eq(schema.billingRecordsTable.hostedInvoiceUrl, hostedUrl)]
              : []),
          ];
          const condition = orClauses.length > 0 ? or(...orClauses) : null;

          if (condition) {
            const [affected] = await this.db
              .update(schema.billingRecordsTable)
              .set({
                status: 'paid',
                hostedInvoiceUrl: hostedUrl,
                stripePaymentIntentId: paymentIntentId ?? undefined,
                updatedAt: new Date(),
              })
              .where(condition)
              .returning({
                id: schema.billingRecordsTable.id,
                clientId: schema.billingRecordsTable.clientId,
                projectId: schema.billingRecordsTable.projectId,
                amountCents: schema.billingRecordsTable.amountCents,
              });
            if (affected) {
              await this.audit.log({
                clientId: affected.clientId,
                userId: null,
                action: 'billing.invoice.paid',
                targetType: 'project',
                targetId: affected.projectId ?? null,
                meta: {
                  billingRecordId: affected.id,
                  amountCents: affected.amountCents,
                },
              });
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        const hostedUrl = invoice['hosted_invoice_url'] ?? null;
        const rawSub =
          invoice['parent']?.['subscription_details']?.['subscription'];
        const subscriptionId =
          typeof rawSub === 'string' ? rawSub : (rawSub?.id ?? null);
        if (subscriptionId) {
          const [affected] = await this.db
            .update(schema.billingRecordsTable)
            .set({
              status: 'past_due',
              hostedInvoiceUrl: hostedUrl,
              updatedAt: new Date(),
            })
            .where(
              eq(
                schema.billingRecordsTable.stripeSubscriptionId,
                subscriptionId,
              ),
            )
            .returning({
              id: schema.billingRecordsTable.id,
              clientId: schema.billingRecordsTable.clientId,
              amountCents: schema.billingRecordsTable.amountCents,
            });

          if (affected) {
            await this.notifications.enqueue({
              type: 'billing.payment_failed',
              billingRecordId: affected.id,
              clientId: affected.clientId,
              amountCents: affected.amountCents,
            });
          }
        }
        break;
      }
    }
  }

  private mapSubStatus(
    stripeStatus: Stripe.Subscription.Status,
  ): BillingRecordStatus {
    switch (stripeStatus) {
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'canceled':
        return 'cancelled';
      default:
        return 'active';
    }
  }
}
