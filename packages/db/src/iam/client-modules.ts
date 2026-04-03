import { boolean, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { clientsTable } from "./clients.js";
import { permissionModulesTable } from "./permission-modules.js";
import { usersTable } from "./users.js";

export const clientModulesTable = pgTable(
  "client_modules",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => permissionModulesTable.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    enabledAt: timestamp("enabled_at", { withTimezone: true }).defaultNow(),
    enabledBy: uuid("enabled_by").references(() => usersTable.id, {
      onDelete: "set null",
    }),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.moduleId], name: "client_modules_pk" })],
);

export type ClientModule = typeof clientModulesTable.$inferSelect;
export type NewClientModule = typeof clientModulesTable.$inferInsert;
