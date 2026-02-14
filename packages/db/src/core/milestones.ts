import { milestoneStatusValues } from "@site-haus/validation/core/enums";
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

export const milestoneStatusEnum = pgEnum(
  "milestone_status",
  milestoneStatusValues
);

export const milestonesTable = pgTable(
  "milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: milestoneStatusEnum("status").default("not_started").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    assigneeId: uuid("assignee_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    signedOffAt: timestamp("signed_off_at", { withTimezone: true }),
    signedOffBy: uuid("signed_off_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("milestones_project_idx").on(t.projectId),
    index("milestones_assignee_idx").on(t.assigneeId),
  ]
);

export type MilestoneStatus =
  (typeof milestoneStatusEnum.enumValues)[number];

export type Milestone = typeof milestonesTable.$inferSelect;
export type NewMilestone = typeof milestonesTable.$inferInsert;
