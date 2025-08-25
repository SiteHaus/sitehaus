import { relations } from "drizzle-orm";
import { usersTable } from "../iam/users.js";
import { projectsTable } from "./projects.js";

export const projectsRelations = relations(projectsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [projectsTable.userId],
    references: [usersTable.id],
  }),
}));
