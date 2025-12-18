import { relations } from "drizzle-orm";
import { clientsTable } from "./clients.js";
import { userConsentsTable } from "./user-consents.js";
import { usersTable } from "./users.js";

export const userConsentsRelations = relations(userConsentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userConsentsTable.userId],
    references: [usersTable.id],
  }),
  client: one(clientsTable, {
    fields: [userConsentsTable.clientId],
    references: [clientsTable.id],
  }),
}));
