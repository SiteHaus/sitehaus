import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const devicesTable = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 120 }),
    platform: varchar("platform", { length: 50 }),
    browser: varchar("browser", { length: 50 }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastIpHash: varchar("last_ip_hash", { length: 64 }),
  },
  (t) => [
    index("devices_user_idx").on(t.userId),
    index("devices_seen_idx").on(t.lastSeenAt),
  ]
);

export type Device = typeof devicesTable.$inferSelect;
export type NewDevice = typeof devicesTable.$inferInsert;
