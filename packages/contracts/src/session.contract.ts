import { initContract } from "@ts-rest/core";
import z from "zod";
import { dateTime } from "./primitives.js";

const c = initContract();

export const deviceInfo = z.object({
  browser: z.string().nullable(),
  platform: z.string().nullable(),
  label: z.string().nullable(),
});

export const sessionItem = z.object({
  id: z.uuid(),
  createdAt: dateTime,
  lastUsedAt: dateTime,
  expiresAt: dateTime,
  ipHash: z.string().nullable().optional(),
  uaHash: z.string().nullable().optional(),
  device: deviceInfo.nullable(),
  isCurrent: z.boolean(),
});

export const sessionRouter = c.router({
  list: {
    method: "GET",
    path: "/session",
    responses: { 200: c.type<{ sessions: z.infer<typeof sessionItem>[] }>() },
  },
  revokeOthers: {
    method: "POST",
    path: "/session/revoke-others",
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

export type SessionListReponse = { sessions: z.infer<typeof sessionItem>[] };
export type SessionItem = z.infer<typeof sessionItem>;
export type DeviceInfo = z.infer<typeof deviceInfo>;
