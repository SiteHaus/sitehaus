import {
  billingRecordStatusValues,
  billingRecordTypeValues,
} from "@site-haus/validation/core/enums";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { clientsTable } from "../iam/clients.js";
import { projectsTable } from "./projects.js";

export const billingRecordTypeEnum = pgEnum(
  "billing_record_type",
  billingRecordTypeValues
);

export const billingRecordStatusEnum = pgEnum(
  "billing_record_status",
  billingRecordStatusValues
);

export const billingRecordsTable = pgTable(
  "billing_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    type: billingRecordTypeEnum("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").default("usd").notNull(),
    status: billingRecordStatusEnum("status").notNull(),
    hostedInvoiceUrl: text("hosted_invoice_url"),
    intervalMonths: integer("interval_months"),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("billing_records_project_idx").on(t.projectId),
    index("billing_records_client_idx").on(t.clientId),
    index("billing_records_status_idx").on(t.status),
    index("billing_records_stripe_customer_idx").on(t.stripeCustomerId),
  ]
);

export type BillingRecordType =
  (typeof billingRecordTypeEnum.enumValues)[number];
export type BillingRecordStatus =
  (typeof billingRecordStatusEnum.enumValues)[number];

export type BillingRecord = typeof billingRecordsTable.$inferSelect;
export type NewBillingRecord = typeof billingRecordsTable.$inferInsert;
