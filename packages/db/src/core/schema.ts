import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const rolesEnum = pgEnum("role", ["client", "admin", "staff"]);
export const projectStatusEnum = pgEnum("project-status", [
  "active",
  "paused",
  "submitted",
  "reviewing",
  "archived",
]);
export const projectTypeEnum = pgEnum("project-type", [
  "ecommerce",
  "saas",
  "portfolio",
  "marketing",
  "landing_page",
  "blog",
  "internal_tool",
  "web_app",
  "rebuild",
  "maintenance",
  "other",
]);
export const projectBillingStatusEnum = pgEnum("project-type", [
  "paid",
  "outstanding",
  "pending",
  "late",
]);

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  name: text("name"),
  role: rolesEnum("role").default("client").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpsTable = pgTable("otps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => usersTable.id, {
      onDelete: "cascade",
    })
    .notNull(),
  codeHash: varchar("code_hash", { length: 128 }).notNull(),
  type: varchar("type", { length: 50 }).default("login").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true })
    .default(sql`now() + interval '15 minutes'`)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const projectsTable = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .references(() => usersTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: projectStatusEnum().default("submitted").notNull(),
  type: projectTypeEnum().default("marketing").notNull(),
  siteDomain: text("site_domain"),
  stagingDomain: text("staging_domain"),
  repoUrl: text("repo_url"),
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  dueDate: timestamp("due_date"),
  launchedAt: timestamp("launched_at"),
  monthlyRateCents: integer("monthly_rate_cents"),
  depositAmountCents: integer("deposit_amount_cents"),
  billingStatus: projectBillingStatusEnum().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
