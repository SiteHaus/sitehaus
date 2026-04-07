import { relations } from "drizzle-orm";
import { clientsTable } from "../iam/clients.js";
import { businessProfilesTable } from "./business-profiles.js";

export const businessProfilesRelations = relations(businessProfilesTable, ({ one }) => ({
  client: one(clientsTable, {
    fields: [businessProfilesTable.clientId],
    references: [clientsTable.id],
  }),
}));
