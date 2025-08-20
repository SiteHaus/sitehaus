import {
  userRolesValues,
  userStatusValues,
} from "@site-haus/validation/core/enums";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const rolesEnum = pgEnum("role", userRolesValues);
export const userStatusEnum = pgEnum("user_status", userStatusValues);
export const otpPurposeEnum = pgEnum("otp_purpose", userStatusValues);

export const usersTable = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 256 }).notNull(),
    firstName: text("name").notNull(),
    lastName: text("name").notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    emailVerifiedAt: timestamp("email_verified_at"),
    status: userStatusEnum("status").notNull().default("active"),
    lastLogin: timestamp("last_login"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)]
);

export const passwordCredentialsTable = pgTable("password_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  version: varchar("version", { length: 32 }).notNull().default("argon2id-1"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const otpsTable = pgTable(
  "otps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
      }),
    purpose: varchar("purpose", { length: 32 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at")
      .default(sql`now() + interval '15 minutes'`)
      .notNull(),
    consumedAt: timestamp("consumed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [
    index("otp_user_purpose_idx").on(t.userId, t.purpose),
    index("otps_expires_idx").on(t.expiresAt),
  ]
);

export const devicesTable = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }),
    platform: varchar("platform", { length: 50 }),
    browser: varchar("browser", { length: 50 }),
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    lastIpHash: varchar("last_ip_hash", { length: 64 }),
  },
  (t) => [
    index("devices_user_idx").on(t.userId),
    index("devices_seen_idx").on(t.lastSeenAt),
  ]
);

export const sessionsTable = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => devicesTable.id, {
      onDelete: "set null",
    }),
    clientKey: varchar("client_key", { length: 64 }).notNull(),
    refreshHash: text("refresh_hash").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    ipHash: varchar("ip_hash", { length: 64 }),
    uaHash: varchar("ua_hash", { length: 64 }),
    meta: jsonb("meta"),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_device_idx").on(t.deviceId),
    index("sessions_client_idx").on(t.clientKey),
    uniqueIndex("sessions_refresh_uq").on(t.refreshHash),
    index("sessions_expires_idx").on(t.expiresAt),
  ]
);

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type PasswordCredential = typeof passwordCredentialsTable.$inferSelect;
export type NewPasswordCredential =
  typeof passwordCredentialsTable.$inferInsert;

export type Otp = typeof otpsTable.$inferSelect;
export type NewOtp = typeof otpsTable.$inferInsert;

export type Device = typeof devicesTable.$inferSelect;
export type NewDevice = typeof devicesTable.$inferInsert;

export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;
