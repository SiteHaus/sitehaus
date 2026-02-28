import { billingRecordStatusValues, billingRecordTypeValues } from "@site-haus/validation/core/enums";
import { z } from "zod";

export const billingRecordTypeEnum = z.enum(billingRecordTypeValues);
export const billingRecordStatusEnum = z.enum(billingRecordStatusValues);

export const createSubscriptionSchema = z.object({
  clientId: z.uuid(),
  projectId: z.uuid(),
  amountCents: z.number().int().positive(),
  intervalMonths: z.number().int().min(1).default(1),
  billingEmail: z.email().optional(),
});

export const createOneTimeSchema = z.object({
  clientId: z.uuid(),
  projectId: z.uuid(),
  amountCents: z.number().int().positive(),
  description: z.string().optional(),
  billingEmail: z.email().optional(),
});

export const listBillingQuerySchema = z.object({
  clientId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  status: billingRecordStatusEnum.optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type CreateOneTimeInput = z.infer<typeof createOneTimeSchema>;
export type ListBillingQuery = z.infer<typeof listBillingQuerySchema>;
