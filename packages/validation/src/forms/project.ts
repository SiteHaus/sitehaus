import {
  projectBillingStatusValues,
  projectStatusValues,
  projectTypeValues,
} from "@site-haus/validation/core/enums";
import { z } from "zod";

export const projectTypeEnum = z.enum(projectTypeValues);

export const projectStatusEnum = z.enum(projectStatusValues);

export const projectBillingStatusEnum = z.enum(projectBillingStatusValues);

export const createProjectSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),

  type: projectTypeEnum,
  status: projectStatusEnum,
  billingStatus: projectBillingStatusEnum,

  siteDomain: z.url().optional(),
  stagingDomain: z.url().optional(),
  repoUrl: z.url().optional(),

  monthlyRateCents: z.number().int().positive().optional(),
  depositAmountCents: z.number().int().nonnegative().optional(),

  isActive: z.boolean(),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  launchedAt: z.date().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
