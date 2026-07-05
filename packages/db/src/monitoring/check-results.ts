import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { monitorsTable } from "./monitors.js";

export const checkResultsTable = pgTable(
  "check_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitorsTable.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull(),
    latencyMs: integer("latency_ms"),
    detail: jsonb("detail"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("check_results_monitor_checked_idx").on(t.monitorId, t.checkedAt)],
);

export type CheckResultRow = typeof checkResultsTable.$inferSelect;
export type NewCheckResult = typeof checkResultsTable.$inferInsert;
