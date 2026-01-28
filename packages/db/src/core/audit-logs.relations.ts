import { relations } from "drizzle-orm";
import { clientsTable } from "../iam/clients.js";
import { usersTable } from "../iam/users.js";
import { auditLogTable } from "./audit-logs.js";

export const auditLogRelations = relations(auditLogTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [auditLogTable.clientId],
    references: [clientsTable.id],
  }),
  user: one(usersTable, {
    fields: [auditLogTable.userId],
    references: [usersTable.id],
  }),
}));
