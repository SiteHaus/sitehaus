import { relations } from "drizzle-orm";
import { checkResultsTable } from "./check-results.js";
import { monitorsTable } from "./monitors.js";

export const checkResultsRelations = relations(checkResultsTable, ({ one }) => ({
  monitor: one(monitorsTable, {
    fields: [checkResultsTable.monitorId],
    references: [monitorsTable.id],
  }),
}));
