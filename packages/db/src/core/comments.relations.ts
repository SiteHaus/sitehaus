import { relations } from "drizzle-orm";
import { usersTable } from "../iam/users.js";
import { commentsTable } from "./comments.js";

export const commentsRelations = relations(
  commentsTable,
  ({ one, many }) => ({
    author: one(usersTable, {
      fields: [commentsTable.authorId],
      references: [usersTable.id],
    }),
    parent: one(commentsTable, {
      fields: [commentsTable.parentId],
      references: [commentsTable.id],
      relationName: "commentThread",
    }),
    replies: many(commentsTable, { relationName: "commentThread" }),
  })
);
