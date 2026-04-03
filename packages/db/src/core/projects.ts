import {
  projectBillingStatusValues,
  projectStatusValues,
  projectTypeValues,
} from "@site-haus/validation/core/enums";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { clientsTable } from "../iam/clients.js";
import { usersTable } from "../iam/users.js";

export const projectStatusEnum = pgEnum("project_status", projectStatusValues);
export const projectTypeEnum = pgEnum("project_type", projectTypeValues);
export const projectBillingStatusEnum = pgEnum(
  "project_billing_status",
  projectBillingStatusValues,
);

export const projectsTable = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .references(() => clientsTable.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),

    status: projectStatusEnum("status").default("submitted").notNull(),
    type: projectTypeEnum("type").default("marketing").notNull(),

    siteDomain: text("site_domain"),
    stagingDomain: text("staging_domain"),

    repoUrl: text("repo_url"),

    isActive: boolean("is_active").default(true),
    startDate: timestamp("start_date", { withTimezone: true }),
    dueDate: timestamp("due_date", { withTimezone: true }),
    launchedAt: timestamp("launched_at", { withTimezone: true }),

    monthlyRateCents: integer("monthly_rate_cents"),
    depositAmountCents: integer("deposit_amount_cents"),
    billingStatus: projectBillingStatusEnum("billing_status").default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("projects_client_idx").on(t.clientId),
    index("projects_user_idx").on(t.userId),
    index("projects_status_idx").on(t.status),
  ],
);

export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type ProjectBillingStatus = (typeof projectBillingStatusEnum.enumValues)[number];
export type ProjectType = (typeof projectTypeEnum.enumValues)[number];

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
