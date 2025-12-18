import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients.js";
import { usersTable } from "./users.js";

export const userConsentsTable = pgTable("user_consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  clientId: uuid("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  scope: varchar("scope", { length: 512 }).notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export type UserConsent = typeof userConsentsTable.$inferSelect;
export type NewUserConsent = typeof userConsentsTable.$inferInsert;
