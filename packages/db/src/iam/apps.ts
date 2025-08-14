import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  displayName: text("display_name").notNull(),
  defaultAudience: text("default_audience").notNull(),
  clientId: text("client_id").notNull().unique(),
  clientSecretHash: text("client_secret_hash"),
  redirectUris: text("redirect_uris").array().notNull(),
  postLogoutRedirectUris: text("post_logout_redirect_uris")
    .array()
    .notNull()
    .default([]),
  allowedScopes: text("allowed_scopes").array().notNull().default([]),
  firstParty: boolean("first_party").notNull().default(true),
  pkceRequired: boolean("pkce_required").notNull().default(true),
  logoUrl: text("logo_url"),
  homeUrl: text("home_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
