import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { apps } from "./apps.js";
import { users } from "./users.js";

export const oauthConsent = pgTable(
  "oauth_consent",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => apps.clientId, { onDelete: "cascade" }),
    scopesGranted: text("scopes_granted").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("oauth_consent_user_client_uniqe").on(t.userId, t.clientId),
  ]
);

export type OauthConsent = typeof oauthConsent.$inferSelect;
export type NewOauthConsent = typeof oauthConsent.$inferInsert;
