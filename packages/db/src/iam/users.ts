import { userStatusValues } from "@site-haus/validation/core/enums";
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", userStatusValues);

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 256 }).notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    status: userStatusEnum("status").notNull().default("active"),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export type UserStatus = (typeof userStatusEnum.enumValues)[number];

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
