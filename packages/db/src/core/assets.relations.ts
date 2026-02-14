import { relations } from "drizzle-orm";
import { usersTable } from "../iam/users.js";
import { assetsTable } from "./assets.js";
import { projectsTable } from "./projects.js";

export const assetsRelations = relations(assetsTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [assetsTable.projectId],
    references: [projectsTable.id],
  }),
  uploader: one(usersTable, {
    fields: [assetsTable.uploadedBy],
    references: [usersTable.id],
  }),
}));
