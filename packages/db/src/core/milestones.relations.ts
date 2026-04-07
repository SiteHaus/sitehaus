import { relations } from "drizzle-orm";
import { usersTable } from "../iam/users.js";
import { milestonesTable } from "./milestones.js";
import { projectsTable } from "./projects.js";

export const milestonesRelations = relations(milestonesTable, ({ one }) => ({
  project: one(projectsTable, {
    fields: [milestonesTable.projectId],
    references: [projectsTable.id],
  }),
  assignee: one(usersTable, {
    fields: [milestonesTable.assigneeId],
    references: [usersTable.id],
    relationName: "milestoneAssignee",
  }),
  signedOffByUser: one(usersTable, {
    fields: [milestonesTable.signedOffBy],
    references: [usersTable.id],
    relationName: "milestoneSignedOff",
  }),
}));
