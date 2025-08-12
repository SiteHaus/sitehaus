import {
  projectBillingStatusValues,
  projectStatusValues,
  projectTypeValues,
  userRolesValues,
} from "@site-haus/validation/core/enums";
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

export const rolesEnum = pgEnum("role", userRolesValues);
export const projectStatusEnum = pgEnum("project-status", projectStatusValues);
export const projectTypeEnum = pgEnum("project-type", projectTypeValues);
export const projectBillingStatusEnum = pgEnum(
  "project-billing-status",
  projectBillingStatusValues
);

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
