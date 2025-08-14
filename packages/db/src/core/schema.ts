import { users } from "@site-haus/db/iam/users";
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

export const projectStatusEnum = pgEnum("project-status", projectStatusValues);
export const projectTypeEnum = pgEnum("project-type", projectTypeValues);
export const projectBillingStatusEnum = pgEnum(
  "project-type",
  projectBillingStatusValues
);

export * as iam from "@site-haus/db/iam/index";

export const projectsTable = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .references(() => users.id, { onDelete: "cascade" })
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
  billingStatus: projectBillingStatusEnum("billingStatus").default("pending"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
