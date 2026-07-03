import { relations } from "drizzle-orm";
import { incidentsTable } from "./incidents.js";
import { monitorsTable } from "./monitors.js";

export const incidentsRelations = relations(incidentsTable, ({ one }) => ({
  monitor: one(monitorsTable, {
    fields: [incidentsTable.monitorId],
    references: [monitorsTable.id],
  }),
}));
