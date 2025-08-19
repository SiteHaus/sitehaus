import { usersTable } from "@site-haus/db/iam/schema";
import {
  projectBillingStatusValues,
  projectStatusValues,
  projectTypeValues,
} from "@site-haus/validation/core/enums";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const projectStatusEnum = pgEnum("project-status", projectStatusValues);
export const projectTypeEnum = pgEnum("project-type", projectTypeValues);
export const projectBillingStatusEnum = pgEnum(
  "project-billing-status",
  projectBillingStatusValues
);

export const auditLogTable = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }),
    targetId: uuid("target_id"),
    ipHash: varchar("ip_hash", { length: 64 }),
    uaHash: varchar("ua_hash", { length: 64 }),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_user_idx").on(t.userId),
    index("audit_created_idx").on(t.createdAt),
  ]
);

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

export type Audit = typeof auditLogTable.$inferSelect;
export type NewAudit = typeof auditLogTable.$inferInsert;

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;
