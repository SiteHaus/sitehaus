import {
  acceptInviteSchema,
  createInviteSchema,
} from "@site-haus/validation/forms/invite";
import { initContract } from "@ts-rest/core";
import z from "zod";
import { apiErrorHttp, apiErrorServer, dateTime } from "./primitives.js";

const c = initContract();

export const inviteDto = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  email: z.email(),
  roleIds: z.array(z.uuid()).default([]),
  expiresAt: dateTime,
  acceptedAt: dateTime.nullable(),
  revokedAt: dateTime.nullable().default(null),
  createdAt: dateTime,
});

export const invitesRouter = c.router({
  list: {
    method: "GET",
    path: "/invites",
    responses: { 200: c.type<{ invites: z.infer<typeof inviteDto>[] }>() },
  },
  create: {
    method: "POST",
    path: "/invites",
    body: createInviteSchema,
    responses: {
      201: c.type<{ invite: z.infer<typeof inviteDto> }>(),
      400: apiErrorHttp,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  cancel: {
    method: "POST",
    path: "/invites/:id/cancel",
    pathParams: c.type<{ id: string }>(),
    body: c.type<undefined>(),
    responses: { 204: c.type<void>(), 404: apiErrorHttp },
  },
  resend: {
    method: "POST",
    path: "/invites/:id/resend",
    pathParams: c.type<{ id: string }>(),
    body: c.type<undefined>(),
    responses: { 204: c.type<void>(), 404: apiErrorHttp },
  },
  accept: {
    method: "POST",
    path: "/invites/accept",
    body: acceptInviteSchema,
    responses: {
      200: c.type<{
        userId: string;
        acceptedAt: string;
        rolesAssigned: string[];
      }>(),
      400: apiErrorHttp,
      401: apiErrorHttp,
      403: apiErrorHttp,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
});
