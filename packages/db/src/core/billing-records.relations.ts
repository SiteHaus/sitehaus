import { relations } from "drizzle-orm";
import { clientsTable } from "../iam/clients.js";
import { billingRecordsTable } from "./billing-records.js";
import { projectsTable } from "./projects.js";

export const billingRecordsRelations = relations(
  billingRecordsTable,
  ({ one }) => ({
    project: one(projectsTable, {
      fields: [billingRecordsTable.projectId],
      references: [projectsTable.id],
    }),
    client: one(clientsTable, {
      fields: [billingRecordsTable.clientId],
      references: [clientsTable.id],
    }),
  })
);
