import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const role = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string(),
});

export const rolesRouter = c.router({
  list: {
    method: "GET",
    path: "/roles",
    responses: { 200: c.type<{ roles: z.infer<typeof role>[] }>() },
  },
  create: {
    method: "POST",
    path: "/roles",
    body: c.type<{
      key: string;
      name: string;
      description?: string;
      isDefault?: boolean;
    }>(),
    responses: { 201: c.type<{ role: z.infer<typeof role> }>() },
  },
  update: {
    method: "PATCH",
    path: "/roles/:roleId",
    pathParams: c.type<{ roleId: string }>(),
    body: c.type<{
      name?: string;
      description?: string;
      isDefault?: boolean;
    }>(),
    responses: { 200: c.type<{ perms: string[] }>() },
  },
  remove: {
    method: "DELETE",
    path: "/roles/:roleId",
    pathParams: c.type<{ roleId: string }>(),
    responses: { 204: c.type<void>() },
  },
  getPerms: {
    method: "GET",
    path: "/roles/:roleId/perms",
    pathParams: c.type<{ roleId: string }>(),
    responses: { 200: c.type<{ perms: string[] }>() },
  },
  replacePerms: {
    method: "POST",
    path: "/roles/:roleId/perms/replace",
    pathParams: c.type<{ roleId: string }>(),
    body: c.type<{ perms: string[] }>(),
    responses: { 204: c.type<void>() },
  },
  listUserRoles: {
    method: "GET",
    path: "/roles/users/:userId/roles",
    pathParams: c.type<{ userId: string }>(),
    responses: { 200: c.type<{ roles: z.infer<typeof role>[] }>() },
  },
  assignRole: {
    method: "POST",
    path: "/roles/users/:userId/roles/:roleId",
    pathParams: c.type<{ userId: string; roleId: string }>(),
    body: c.type<undefined>(),
    responses: { 204: c.type<void>() },
  },
  unassignRole: {
    method: "DELETE",
    path: "/roles/users/:userId/roles/:roleId",
    pathParams: c.type<{ userId: string; roleId: string }>(),
    responses: { 204: c.type<void>() },
  },
});
