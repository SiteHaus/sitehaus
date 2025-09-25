import { initContract } from "@ts-rest/core";
import z from "zod";

const c = initContract();

export const device = z.object({
  id: z.uuid(),
  label: z.string().nullable(),
  platform: z.string().nullable(),
  browser: z.string().nullable(),
  firstSeenAt: z.string(),
  lastSeenAt: z.string(),
  lastActiveAt: z.string(),
  activeSessions: z.number().int(),
});

export const devicesRouter = c.router({
  list: {
    method: "GET",
    path: "/devices",
    responses: { 200: c.type<{ devices: z.infer<typeof device>[] }>() },
  },
  rename: {
    method: "POST",
    path: "/devices/:deviceId/rename",
    pathParams: c.type<{ deviceId: string }>(),
    body: c.type<{ label?: string | null }>(),
    responses: { 204: c.type<void>() },
  },
  revoke: {
    method: "POST",
    path: "/devices/:deviceId/revoke",
    pathParams: c.type<{ deviceId: string }>(),
    body: c.type<undefined>(),
    responses: { 204: c.type<void>() },
  },
});
