import { relations } from "drizzle-orm";
import { clientsTable } from "./clients.js";
import { rolesTable, userRolesTable } from "./roles.js";
import { usersTable } from "./users.js";

export const rolesRelations = relations(rolesTable, ({ one, many }) => ({
  client: one(clientsTable, {
    fields: [rolesTable.clientId],
    references: [clientsTable.id],
  }),
  userRoles: many(userRolesTable),
}));

export const userRolesRelations = relations(userRolesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userRolesTable.userId],
    references: [usersTable.id],
  }),
  client: one(clientsTable, {
    fields: [userRolesTable.clientId],
    references: [clientsTable.id],
  }),
  role: one(rolesTable, {
    fields: [userRolesTable.roleId],
    references: [rolesTable.id],
  }),
}));
