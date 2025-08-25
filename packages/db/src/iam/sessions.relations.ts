import { relations } from "drizzle-orm";
import { clientsTable } from "./clients.js";
import { devicesTable } from "./devices.js";
import { sessionsTable } from "./sessions.js";
import { usersTable } from "./users.js";

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),
  device: one(devicesTable, {
    fields: [sessionsTable.deviceId],
    references: [devicesTable.id],
  }),
  client: one(clientsTable, {
    fields: [sessionsTable.clientId],
    references: [clientsTable.id],
  }),
}));
