import { relations } from "drizzle-orm";
import { usersTable } from "../iam/users.js";
import { designDocumentVersionsTable } from "./design-document-versions.js";
import { designDocumentsTable } from "./design-documents.js";

export const designDocumentVersionsRelations = relations(
  designDocumentVersionsTable,
  ({ one }) => ({
    designDocument: one(designDocumentsTable, {
      fields: [designDocumentVersionsTable.designDocumentId],
      references: [designDocumentsTable.id],
    }),
    creator: one(usersTable, {
      fields: [designDocumentVersionsTable.createdBy],
      references: [usersTable.id],
    }),
  })
);
