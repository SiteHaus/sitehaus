import { commentTargetTypeValues } from "@site-haus/validation/core/enums";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "../iam/users.js";

export const commentTargetTypeEnum = pgEnum(
  "comment_target_type",
  commentTargetTypeValues
);

export const commentsTable = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetType: commentTargetTypeEnum("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    isInternal: boolean("is_internal").default(false).notNull(),
    parentId: uuid("parent_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("comments_target_idx").on(t.targetType, t.targetId),
    index("comments_author_idx").on(t.authorId),
    index("comments_parent_idx").on(t.parentId),
  ]
);

export type CommentTargetType =
  (typeof commentTargetTypeEnum.enumValues)[number];

export type Comment = typeof commentsTable.$inferSelect;
export type NewComment = typeof commentsTable.$inferInsert;
