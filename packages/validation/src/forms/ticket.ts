import {
  ticketPriorityValues,
  ticketStatusValues,
  ticketTypeValues,
} from "@site-haus/validation/core/enums";
import { z } from "zod";

export const ticketTypeEnum = z.enum(ticketTypeValues);
export const ticketPriorityEnum = z.enum(ticketPriorityValues);
export const ticketStatusEnum = z.enum(ticketStatusValues);

export const createTicketSchema = z.object({
  projectId: z.uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: ticketTypeEnum.optional(),
  priority: ticketPriorityEnum.optional(),
});

export const updateTicketSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    type: ticketTypeEnum.optional(),
    priority: ticketPriorityEnum.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No changes provided",
  });

export const ticketStatusTransitionSchema = z.object({
  status: ticketStatusEnum,
});

export const ticketAssignSchema = z.object({
  assigneeId: z.uuid().nullable(),
});

export const listTicketsQuerySchema = z.object({
  projectId: z.uuid().optional(),
  status: ticketStatusEnum.optional(),
  type: ticketTypeEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  assigneeId: z.uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  cursor: z.uuid().optional(),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketStatusTransition = z.infer<
  typeof ticketStatusTransitionSchema
>;
export type TicketAssignInput = z.infer<typeof ticketAssignSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
