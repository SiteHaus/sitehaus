import { relations } from "drizzle-orm";
import { usersTable } from "../schema.js";
import { auditLogTable } from "./audit-logs.js";

export const auditLogRelations = relations(auditLogTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [auditLogTable.userId],
    references: [usersTable.id],
  }),
}));
