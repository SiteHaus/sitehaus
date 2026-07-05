import { boolean, index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { clientsTable } from "../iam/clients.js";

export const monitorsTable = pgTable(
  "monitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    target: varchar("target", { length: 256 }).notNull(),
    group: varchar("group", { length: 32 }).notNull(),
    // Revision v2: null = staff-only (service/infra); set = client-site, scoped to a tenant
    clientId: uuid("client_id").references(() => clientsTable.id, { onDelete: "cascade" }),
    thresholds: jsonb("thresholds"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("monitors_group_idx").on(t.group),
    index("monitors_client_idx").on(t.clientId),
    index("monitors_enabled_idx").on(t.enabled),
  ],
);

export type Monitor = typeof monitorsTable.$inferSelect;
export type NewMonitor = typeof monitorsTable.$inferInsert;
