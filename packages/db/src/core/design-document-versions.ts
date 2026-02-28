import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "../iam/users.js";
import { designDocumentsTable } from "./design-documents.js";

export const designDocumentVersionsTable = pgTable(
  "design_document_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    designDocumentId: uuid("design_document_id")
      .notNull()
      .references(() => designDocumentsTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    content: text("content").notNull(),
    changeNote: text("change_note"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("design_doc_versions_doc_version_uq").on(
      t.designDocumentId,
      t.version
    ),
  ]
);

export type DesignDocumentVersion =
  typeof designDocumentVersionsTable.$inferSelect;
export type NewDesignDocumentVersion =
  typeof designDocumentVersionsTable.$inferInsert;
