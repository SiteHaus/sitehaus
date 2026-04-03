import { relations } from "drizzle-orm";
import { usersTable } from "../iam/users.js";
import { commentsTable } from "./comments.js";
import { projectsTable } from "./projects.js";
import { ticketsTable } from "./tickets.js";

export const ticketsRelations = relations(ticketsTable, ({ one, many }) => ({
  project: one(projectsTable, {
    fields: [ticketsTable.projectId],
    references: [projectsTable.id],
  }),
  author: one(usersTable, {
    fields: [ticketsTable.authorId],
    references: [usersTable.id],
    relationName: "ticketAuthor",
  }),
  assignee: one(usersTable, {
    fields: [ticketsTable.assigneeId],
    references: [usersTable.id],
    relationName: "ticketAssignee",
  }),
  comments: many(commentsTable),
}));
