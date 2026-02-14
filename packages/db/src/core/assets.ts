import { assetReviewStatusValues } from "@site-haus/validation/core/enums";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "../iam/users.js";
import { projectsTable } from "./projects.js";

export const assetReviewStatusEnum = pgEnum(
  "asset_review_status",
  assetReviewStatusValues
);

export const assetsTable = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    reviewStatus: assetReviewStatusEnum("review_status")
      .default("pending")
      .notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("assets_project_idx").on(t.projectId),
    index("assets_uploaded_by_idx").on(t.uploadedBy),
  ]
);

export type AssetReviewStatus =
  (typeof assetReviewStatusEnum.enumValues)[number];

export type Asset = typeof assetsTable.$inferSelect;
export type NewAsset = typeof assetsTable.$inferInsert;
