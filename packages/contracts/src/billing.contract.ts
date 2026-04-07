import {
  billingRecordStatusValues,
  billingRecordTypeValues,
} from "@site-haus/validation/core/enums";
import {
  createOneTimeSchema,
  createSubscriptionSchema,
  listBillingQuerySchema,
} from "@site-haus/validation/forms/billing";
import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { apiErrorHttp, apiErrorValidation, apiErrorServer, dateTime } from "./primitives.js";

const c = initContract();

export const billingRecordItem = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  clientId: z.uuid(),
  stripeCustomerId: z.string(),
  stripeSubscriptionId: z.string().nullable(),
  stripePaymentIntentId: z.string().nullable(),
  hostedInvoiceUrl: z.string().nullable(),
  type: z.enum(billingRecordTypeValues),
  amountCents: z.number(),
  currency: z.string(),
  status: z.enum(billingRecordStatusValues),
  intervalMonths: z.number().nullable(),
  currentPeriodStart: dateTime.nullable(),
  currentPeriodEnd: dateTime.nullable(),
  createdAt: dateTime.nullable(),
  updatedAt: dateTime.nullable(),
});

export const clientRevenueSummary = z.object({
  clientId: z.uuid(),
  clientName: z.string(),
  mrrCents: z.number(),
  totalPaidCents: z.number(),
  status: z.enum(billingRecordStatusValues).nullable(),
  lastPaymentAt: dateTime.nullable(),
});

export const adminBillingOverview = z.object({
  mrrCents: z.number(),
  totalRevenueCents: z.number(),
  overdueCount: z.number(),
  overdueAmountCents: z.number(),
  activeClientCount: z.number(),
  revenueByClient: z.array(clientRevenueSummary),
  records: z.array(billingRecordItem),
});

export const billingRouter = c.router({
  list: {
    method: "GET",
    path: "/billing",
    query: listBillingQuerySchema,
    responses: {
      200: z.object({ records: z.array(billingRecordItem) }),
      401: apiErrorHttp,
      403: apiErrorHttp,
    },
  },
  getPortalUrl: {
    method: "GET",
    path: "/billing/portal",
    responses: {
      200: z.object({ url: z.string().url() }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  getAdminOverview: {
    method: "GET",
    path: "/billing/admin",
    responses: {
      200: adminBillingOverview,
      401: apiErrorHttp,
      403: apiErrorHttp,
    },
  },
  createSubscription: {
    method: "POST",
    path: "/billing/subscriptions",
    body: createSubscriptionSchema,
    responses: {
      201: z.object({ record: billingRecordItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  createOneTime: {
    method: "POST",
    path: "/billing/one-time",
    body: createOneTimeSchema,
    responses: {
      201: z.object({ record: billingRecordItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      500: apiErrorServer,
    },
  },
});

export type BillingRecordItem = z.infer<typeof billingRecordItem>;
export type AdminBillingOverview = z.infer<typeof adminBillingOverview>;
export type ClientRevenueSummary = z.infer<typeof clientRevenueSummary>;
