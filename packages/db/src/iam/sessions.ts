import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { clientsTable } from "./clients.js";
import { devicesTable } from "./devices.js";
import { usersTable } from "./users.js";

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
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    refreshHash: text("refresh_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ipHash: varchar("ip_hash", { length: 64 }),
    uaHash: varchar("ua_hash", { length: 64 }),
    meta: jsonb("meta"),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_device_idx").on(t.deviceId),
    index("sessions_client_idx").on(t.clientId),
    uniqueIndex("sessions_refresh_uq").on(t.refreshHash),
    index("sessions_expires_idx").on(t.expiresAt),
  ]
);

export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;
