import { relations } from "drizzle-orm";
import { usersTable } from "../iam/users.js";
import { commentsTable } from "./comments.js";
import { designDocumentVersionsTable } from "./design-document-versions.js";
import { designDocumentsTable } from "./design-documents.js";
import { projectsTable } from "./projects.js";

export const designDocumentsRelations = relations(
  designDocumentsTable,
  ({ one, many }) => ({
    project: one(projectsTable, {
      fields: [designDocumentsTable.projectId],
      references: [projectsTable.id],
    }),
    approver: one(usersTable, {
      fields: [designDocumentsTable.approvedBy],
      references: [usersTable.id],
      relationName: "designDocApprover",
    }),
    creator: one(usersTable, {
      fields: [designDocumentsTable.createdBy],
      references: [usersTable.id],
      relationName: "designDocCreator",
    }),
    versions: many(designDocumentVersionsTable),
    comments: many(commentsTable),
  })
);
