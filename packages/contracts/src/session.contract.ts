import { initContract } from "@ts-rest/core";
import z from "zod";
import { dateTime } from "./primitives.js";

const c = initContract();

export const sessionItem = z.object({
  id: z.uuid(),
  createdAt: dateTime,
  lastUsedAt: dateTime,
  expiresAt: dateTime,
  ipHash: z.string().nullable().optional(),
  uaHash: z.string().nullable().optional(),
});

export const sessionRouter = c.router({
  list: {
    method: "GET",
    path: "/session",
    responses: { 200: c.type<{ sessions: z.infer<typeof sessionItem>[] }>() },
  },
  revokeOthers: {
    method: "POST",
    path: "/sessions/revoke-others",
    body: z.void(),
    responses: { 204: z.void() },
  },
  revokeOne: {
    method: "POST",
    path: "/session/:sessionId/revoke",
    pathParams: c.type<{ sessionId: string }>(),
    body: z.void(),
    responses: { 204: z.void() },
  },
});
