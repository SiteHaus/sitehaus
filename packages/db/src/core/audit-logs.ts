import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { clientsTable } from "../iam/clients.js";
import { usersTable } from "../iam/users.js";

export const auditLogTable = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id").references(() => clientsTable.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }),
    targetId: uuid("target_id"),
    ipHash: varchar("ip_hash", { length: 64 }),
    uaHash: varchar("ua_hash", { length: 64 }),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_client_idx").on(t.clientId),
    index("audit_user_idx").on(t.userId),
    index("audit_created_idx").on(t.createdAt),
  ]
);

export type Audit = typeof auditLogTable.$inferSelect;
export type NewAudit = typeof auditLogTable.$inferInsert;
