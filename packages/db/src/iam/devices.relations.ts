import { relations } from "drizzle-orm";
import { devicesTable } from "./devices.js";
import { sessionsTable } from "./sessions.js";
import { usersTable } from "./users.js";

export const devicesRelations = relations(devicesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [devicesTable.userId],
    references: [usersTable.id],
  }),
  sessions: many(sessionsTable),
}));
