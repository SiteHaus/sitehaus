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
  clientId: z.uuid(),
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  type: projectTypeEnum,
  siteDomain: z.string().optional(),
  stagingDomain: z.string().optional(),
  repoUrl: z.string().optional(),
  monthlyRateCents: z.number().int().nonnegative().optional(),
  depositAmountCents: z.number().int().nonnegative().optional(),
  startDate: z.iso.datetime().optional(),
  dueDate: z.iso.datetime().optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().min(2).optional(),
    description: z.string().nullable().optional(),
    type: projectTypeEnum.optional(),
    siteDomain: z.string().nullable().optional(),
    stagingDomain: z.string().nullable().optional(),
    repoUrl: z.string().nullable().optional(),
    monthlyRateCents: z.number().int().nonnegative().nullable().optional(),
    depositAmountCents: z.number().int().nonnegative().nullable().optional(),
    billingStatus: projectBillingStatusEnum.optional(),
    isActive: z.boolean().optional(),
    startDate: z.iso.datetime().nullable().optional(),
    dueDate: z.iso.datetime().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No changes provided",
  });

export const projectStatusTransitionSchema = z.object({
  status: projectStatusEnum,
});

export const listProjectsQuerySchema = z.object({
  status: projectStatusEnum.optional(),
  type: projectTypeEnum.optional(),
  clientId: z.uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  cursor: z.uuid().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectStatusTransition = z.infer<typeof projectStatusTransitionSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
