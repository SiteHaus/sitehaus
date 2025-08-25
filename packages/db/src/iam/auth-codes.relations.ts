import { relations } from "drizzle-orm";
import { authCodesTable } from "./auth-codes.js";
import { clientsTable } from "./clients.js";
import { sessionsTable } from "./sessions.js";
import { usersTable } from "./users.js";

export const authCodesRelations = relations(authCodesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [authCodesTable.userId],
    references: [usersTable.id],
  }),
  client: one(clientsTable, {
    fields: [authCodesTable.clientId],
    references: [clientsTable.id],
  }),
  session: one(sessionsTable, {
    fields: [authCodesTable.sessionId],
    references: [sessionsTable.id],
  }),
}));
