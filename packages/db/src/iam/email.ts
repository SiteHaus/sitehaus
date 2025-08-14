import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { apps } from "./apps.js";

export const authChannelsEnum = pgEnum("auth_channels", ["otp", "magic_link"]);

export const emailLoginAttempts = pgTable("email_login_attempt", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  channel: authChannelsEnum("channel").notNull().default("otp"),
  deliverTo: text("deliver_to"),
  clientId: text("client_id")
    .notNull()
    .references(() => apps.clientId),
  redirectUri: text("redirect_uri").notNull(),
  ipHash: text("ip_hash"),
  uaHash: text("ua_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export type EmailLoginAttempt = typeof emailLoginAttempts.$inferSelect;
export type NewEmailLoginAttempt = typeof emailLoginAttempts.$inferInsert;
