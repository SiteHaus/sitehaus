import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { apiErrorHttp, dateTime } from "./primitives.js";

const c = initContract();

export const auditLogUser = z
  .object({
    id: z.uuid(),
    email: z.email(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .nullable();

export const auditLogItem = z.object({
  id: z.uuid(),
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.uuid().nullable(),
  ipHash: z.string().nullable(),
  meta: z.unknown().nullable(),
  createdAt: dateTime,
  user: auditLogUser,
});

export const auditListQuery = z.object({
  startDate: z.iso.datetime().optional(),
  endDate: z.iso.datetime().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  userId: z.uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  cursor: z.uuid().optional(),
});

export const auditListResponse = z.object({
  logs: z.array(auditLogItem),
  nextCursor: z.uuid().optional(),
});

export const auditRouter = c.router({
  list: {
    method: "GET",
    path: "/audit",
    query: auditListQuery,
    responses: {
      200: auditListResponse,
      403: apiErrorHttp,
    },
  },
});

export type AuditLogItem = z.infer<typeof auditLogItem>;
export type AuditLogUser = z.infer<typeof auditLogUser>;
export type AuditListQuery = z.infer<typeof auditListQuery>;
export type AuditListResponse = z.infer<typeof auditListResponse>;
