import { clientTypeValues } from "@site-haus/validation/core/enums";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const clientTypeEnum = pgEnum("client_type", clientTypeValues);

export const clientsTable = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    type: clientTypeEnum("type").notNull().default("public"),
    firstParty: boolean("first_party").notNull().default(true),
    audience: varchar("audience", { length: 128 }).notNull(),
    allowedScopes: text("allowed_scopes").default("openid profile email"),
    requiresConsent: boolean("requires_consent").default(false).notNull(),
    hidden: boolean("hidden").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("clients_key_uq").on(t.key),
    index("clients_aud_idx").on(t.audience),
  ]
);

export const clientRedirectUrisTable = pgTable(
  "client_redirect_uris",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, {
        onDelete: "cascade",
      }),
    uri: varchar("uri", { length: 512 }).notNull(),
  },
  (t) => [uniqueIndex("client_uri_uq").on(t.clientId, t.uri)]
);

export type ClientType = (typeof clientTypeEnum.enumValues)[number];

export type Client = typeof clientsTable.$inferSelect;
export type NewClient = typeof clientsTable.$inferInsert;

export type ClientRedirectUri = typeof clientRedirectUrisTable.$inferSelect;
export type NewClientRedirectUri = typeof clientRedirectUrisTable.$inferInsert;
