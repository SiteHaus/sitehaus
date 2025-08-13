import {
  projectBillingStatusValues,
  projectStatusValues,
  projectTypeValues,
  userRolesValues,
} from "@site-haus/validation/core/enums";
import { sql } from "drizzle-orm";
import {
  boolean,
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
  "project-type",
  projectBillingStatusValues
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

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
