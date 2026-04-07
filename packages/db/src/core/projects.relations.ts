import { relations } from "drizzle-orm";
import { clientsTable } from "../iam/clients.js";
import { usersTable } from "../iam/users.js";
import { assetsTable } from "./assets.js";
import { designDocumentsTable } from "./design-documents.js";
import { milestonesTable } from "./milestones.js";
import { projectsTable } from "./projects.js";
import { ticketsTable } from "./tickets.js";

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  client: one(clientsTable, {
    fields: [projectsTable.clientId],
    references: [clientsTable.id],
  }),
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
  designDocument: one(designDocumentsTable),
  milestones: many(milestonesTable),
  tickets: many(ticketsTable),
  assets: many(assetsTable),
}));
