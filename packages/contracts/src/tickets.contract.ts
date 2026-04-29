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
  number: z.number(),
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

export const ticketAttachment = z.object({
  id: z.uuid(),
  ticketId: z.uuid(),
  uploadedBy: z.uuid(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  storageKey: z.string(),
  downloadUrl: z.string(),
  createdAt: dateTime.nullable(),
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
  listAttachments: {
    method: "GET",
    path: "/tickets/:ticketId/attachments",
    pathParams: c.type<{ ticketId: string }>(),
    responses: {
      200: z.object({ attachments: z.array(ticketAttachment) }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  uploadAttachment: {
    method: "POST",
    path: "/tickets/:ticketId/attachments/upload",
    pathParams: c.type<{ ticketId: string }>(),
    contentType: "multipart/form-data",
    body: c.type<{ file: File }>(),
    responses: {
      201: z.object({ attachment: ticketAttachment }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  deleteAttachment: {
    method: "DELETE",
    path: "/tickets/:ticketId/attachments/:attachmentId",
    pathParams: c.type<{ ticketId: string; attachmentId: string }>(),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
});

export type TicketItem = z.infer<typeof ticketItem>;
export type TicketDetail = z.infer<typeof ticketDetail>;
export type TicketListResponse = z.infer<typeof ticketListResponse>;
export type TicketAttachment = z.infer<typeof ticketAttachment>;
