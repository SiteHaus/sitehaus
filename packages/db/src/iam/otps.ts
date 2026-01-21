import { otpPurposeValues } from "@site-haus/validation/core/enums";
import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const otpPurposeEnum = pgEnum("otp_purpose", otpPurposeValues);

export const otpsTable = pgTable(
  "otps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
      }),
    purpose: otpPurposeEnum("purpose").notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    /** Optional metadata for OTP-specific data (e.g., new email for email_change) */
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .default(sql`now() + interval '15 minutes'`)
      .notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("otp_user_purpose_idx").on(t.userId, t.purpose),
    index("otps_expires_idx").on(t.expiresAt),
  ]
);

export type OtpPurpose = (typeof otpPurposeEnum.enumValues)[number];

export type Otp = typeof otpsTable.$inferSelect;
export type NewOtp = typeof otpsTable.$inferInsert;
