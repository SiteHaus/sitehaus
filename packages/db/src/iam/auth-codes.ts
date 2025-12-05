import { codeChallengeMethodValues } from "@site-haus/validation/core/enums";
import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { clientsTable } from "./clients.js";
import { sessionsTable } from "./sessions.js";
import { usersTable } from "./users.js";

export const codeChallengeMethodEnum = pgEnum(
  "code_challenge_method",
  codeChallengeMethodValues
);

export const authCodesTable = pgTable(
  "auth_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "cascade",
    }),
    clientId: uuid("client_id").references(() => clientsTable.id, {
      onDelete: "cascade",
    }),
    redirectUri: varchar("redirect_uri", { length: 512 }).notNull(),
    codeChallenge: varchar("code_challenge", { length: 128 }).notNull(),
    method: codeChallengeMethodEnum("code_challenge_method")
      .notNull()
      .default("S256"),
    sessionId: uuid("session_id").references(() => sessionsTable.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .default(sql`now() + interval '90 seconds'`)
      .notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("auth_codes_hash_uq").on(t.codeHash),
    index("auth_codes_user_client_idx").on(t.userId, t.clientId),
    index("auth_codes_expires_idx").on(t.expiresAt),
  ]
);
