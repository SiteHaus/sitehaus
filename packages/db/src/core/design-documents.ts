import { designDocumentStatusValues } from "@site-haus/validation/core/enums";
import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../iam/users.js";
import { projectsTable } from "./projects.js";

export const designDocumentStatusEnum = pgEnum(
  "design_document_status",
  designDocumentStatusValues,
);

export const designDocumentsTable = pgTable(
  "design_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    content: text("content"),
    status: designDocumentStatusEnum("status").default("draft").notNull(),
    currentVersion: integer("current_version").default(1).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("design_documents_project_uq").on(t.projectId)],
);

export type DesignDocumentStatus = (typeof designDocumentStatusEnum.enumValues)[number];

export type DesignDocument = typeof designDocumentsTable.$inferSelect;
export type NewDesignDocument = typeof designDocumentsTable.$inferInsert;
