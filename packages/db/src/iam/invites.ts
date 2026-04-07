import { sql } from "drizzle-orm";
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients.js";
import { usersTable } from "./users.js";

export const invitesTable = pgTable(
  "invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 256 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    invitedBy: uuid("invited_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("invites_client_idx").on(t.clientId),
    index("invites_code_hash_idx").on(t.codeHash),
    uniqueIndex("invites_open_email_uq")
      .on(t.clientId, t.email)
      .where(sql`accepted_at IS NULL AND revoked_at IS NULL`),
  ],
);

export type Invite = typeof invitesTable.$inferSelect;
export type NewInvite = typeof invitesTable.$inferInsert;
