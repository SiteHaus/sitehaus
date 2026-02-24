import { milestoneStatusValues } from "@site-haus/validation/core/enums";
import { z } from "zod";

export const milestoneStatusEnum = z.enum(milestoneStatusValues);

export const createMilestoneSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  dueDate: z.iso.datetime().optional(),
  assigneeId: z.uuid().optional(),
});

export const updateMilestoneSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    status: milestoneStatusEnum.optional(),
    dueDate: z.iso.datetime().nullable().optional(),
    assigneeId: z.uuid().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No changes provided",
  });

export const reorderMilestonesSchema = z.object({
  orderedIds: z.array(z.uuid()).min(1),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
export type ReorderMilestonesInput = z.infer<typeof reorderMilestonesSchema>;
