import {
  ticketPriorityValues,
  ticketStatusValues,
  ticketTypeValues,
} from "@site-haus/validation/core/enums";
import {
  createTicketSchema,
  listTicketsQuerySchema,
  ticketAssignSchema,
  ticketStatusTransitionSchema,
  updateTicketSchema,
} from "@site-haus/validation/forms/ticket";
import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  apiErrorHttp,
  apiErrorServer,
  apiErrorValidation,
  dateTime,
  userBrief,
} from "./primitives.js";

const c = initContract();

export const ticketItem = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(ticketTypeValues),
  priority: z.enum(ticketPriorityValues),
  status: z.enum(ticketStatusValues),
  authorId: z.uuid(),
  assigneeId: z.uuid().nullable(),
  closedAt: dateTime.nullable(),
  createdAt: dateTime.nullable(),
  updatedAt: dateTime.nullable(),
});

export const ticketDetail = ticketItem.extend({
  author: userBrief.nullable(),
  assignee: userBrief.nullable(),
  projectName: z.string(),
  commentCount: z.number(),
});

export const ticketListResponse = z.object({
  tickets: z.array(ticketItem),
  nextCursor: z.uuid().optional(),
});

export const ticketsRouter = c.router({
  list: {
    method: "GET",
    path: "/tickets",
    query: listTicketsQuerySchema,
    responses: {
      200: ticketListResponse,
      401: apiErrorHttp,
      403: apiErrorHttp,
    },
  },
  get: {
    method: "GET",
    path: "/tickets/:ticketId",
    pathParams: c.type<{ ticketId: string }>(),
    responses: {
      200: z.object({ ticket: ticketDetail }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  create: {
    method: "POST",
    path: "/tickets",
    body: createTicketSchema,
    responses: {
      201: z.object({ ticket: ticketItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  update: {
    method: "PATCH",
    path: "/tickets/:ticketId",
    pathParams: c.type<{ ticketId: string }>(),
    body: updateTicketSchema,
    responses: {
      200: z.object({ ticket: ticketItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  transitionStatus: {
    method: "PATCH",
    path: "/tickets/:ticketId/status",
    pathParams: c.type<{ ticketId: string }>(),
    body: ticketStatusTransitionSchema,
    responses: {
      200: z.object({ ticket: ticketItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  assign: {
    method: "PATCH",
    path: "/tickets/:ticketId/assign",
    pathParams: c.type<{ ticketId: string }>(),
    body: ticketAssignSchema,
    responses: {
      200: z.object({ ticket: ticketItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
});

export type TicketItem = z.infer<typeof ticketItem>;
export type TicketDetail = z.infer<typeof ticketDetail>;
export type TicketListResponse = z.infer<typeof ticketListResponse>;
