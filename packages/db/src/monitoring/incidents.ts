import { boolean, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { monitorsTable } from "./monitors.js";

export const incidentsTable = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitorsTable.id, { onDelete: "cascade" }),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    lastStatus: varchar("last_status", { length: 16 }).notNull(),
    notifiedOpen: boolean("notified_open").notNull().default(false),
    notifiedResolved: boolean("notified_resolved").notNull().default(false),
  },
  (t) => [
    index("incidents_monitor_idx").on(t.monitorId),
    index("incidents_open_idx").on(t.resolvedAt),
  ],
);

export type Incident = typeof incidentsTable.$inferSelect;
export type NewIncident = typeof incidentsTable.$inferInsert;
