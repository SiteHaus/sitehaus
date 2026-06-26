import { relations } from "drizzle-orm";
import { clientsTable } from "../iam/clients.js";
import { monitorsTable } from "./monitors.js";
import { checkResultsTable } from "./check-results.js";
import { incidentsTable } from "./incidents.js";

export const monitorsRelations = relations(monitorsTable, ({ one, many }) => ({
  client: one(clientsTable, { fields: [monitorsTable.clientId], references: [clientsTable.id] }),
  results: many(checkResultsTable),
  incidents: many(incidentsTable),
}));
