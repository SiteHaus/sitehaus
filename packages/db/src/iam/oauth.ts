import {
  AnyPgColumn,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { apps } from "./apps.js";
import { sessions } from "./sessions.js";
import { users } from "./users.js";

export const oauthAuthCodes = pgTable("oauth_auth_code", {
  codeHash: text("code_hash").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => apps.clientId, { onDelete: "cascade" }),
  scope: text("scope").array().notNull(),
  redirectUri: text("redirect_uri").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  codeChallengeMethod: text("code_challenge_method").notNull(),
  nonce: text("nonce"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
});

export const oauthRefreshTokens = pgTable("oauth_refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id").notNull().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id")
    .notNull()
    .references(() => apps.clientId, { onDelete: "cascade" }),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  scope: text("scope").array().notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  rotatedFromId: uuid("rotated_from_id").references(
    (): AnyPgColumn => oauthRefreshTokens.id
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export type OauthCode = typeof oauthAuthCodes.$inferSelect;
export type NewOauthCode = typeof oauthAuthCodes.$inferInsert;

export type OauthRefreshToken = typeof oauthAuthCodes.$inferSelect;
export type NewOauthRefreshToken = typeof oauthAuthCodes.$inferInsert;
