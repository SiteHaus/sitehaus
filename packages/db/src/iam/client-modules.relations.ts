import { relations } from "drizzle-orm";
import { clientModulesTable } from "./client-modules.js";
import { clientsTable } from "./clients.js";
import { permissionModulesTable } from "./permission-modules.js";
import { usersTable } from "./users.js";

export const clientModulesRelations = relations(clientModulesTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [clientModulesTable.clientId],
    references: [clientsTable.id],
  }),
  module: one(permissionModulesTable, {
    fields: [clientModulesTable.moduleId],
    references: [permissionModulesTable.id],
  }),
  enabledByUser: one(usersTable, {
    fields: [clientModulesTable.enabledBy],
    references: [usersTable.id],
  }),
}));
