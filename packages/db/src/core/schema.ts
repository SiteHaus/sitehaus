import {
  projectBillingStatusValues,
  projectStatusValues,
  projectTypeValues,
} from "@site-haus/validation/core/enums";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { usersTable } from "src/iam/users.js";

export const projectStatusEnum = pgEnum("project_status", projectStatusValues);
export const projectTypeEnum = pgEnum("project_type", projectTypeValues);
export const projectBillingStatusEnum = pgEnum(
  "project_billing_status",
  projectBillingStatusValues
);

export const projectsTable = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),

  status: projectStatusEnum("status").default("submitted").notNull(),
  type: projectTypeEnum("type").default("marketing").notNull(),

  siteDomain: text("site_domain"),
  stagingDomain: text("staging_domain"),

  repoUrl: text("repo_url"),

  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  launchedAt: timestamp("launched_at"),

  monthlyRateCents: integer("monthly_rate_cents"),
  depositAmountCents: integer("deposit_amount_cents"),
  billingStatus: projectBillingStatusEnum("billing_status").default("pending"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
