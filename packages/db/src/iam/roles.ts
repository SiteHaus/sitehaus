import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { clientsTable } from "./clients.js";
import { usersTable } from "./users.js";

export const rolesTable = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, {
        onDelete: "cascade",
      }),
    key: varchar("key", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 255 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex("roles_client_key_uq").on(t.clientId, t.key),
    index("roles_client_idx").on(t.clientId),
    uniqueIndex("roles_one_default_per_client")
      .on(t.clientId)
      .where(sql`${t.isDefault} = true`),
  ]
);

export const userRolesTable = pgTable(
  "user_roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
      }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, {
        onDelete: "cascade",
      }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesTable.id, {
        onDelete: "cascade",
      }),
    assignedBy: uuid("assigned_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("user_client_role_uq").on(t.userId, t.clientId, t.roleId),
    index("user_client_idx").on(t.userId, t.clientId),
  ]
);

export const permissionsCatalogTable = pgTable("permissions_catalog", {
  perm: varchar("perm", { length: 128 }).primaryKey(),
});

export const rolePermissionsTable = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
    perm: varchar("perm", { length: 128 })
      .notNull()
      .references(() => permissionsCatalogTable.perm, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.perm], name: "role_permissions_pk" }),
    index("role_perms_perm_idx").on(t.perm),
  ]
);

export type Role = typeof rolesTable.$inferSelect;
export type NewRole = typeof rolesTable.$inferInsert;

export type UserRole = typeof userRolesTable.$inferSelect;
export type NewUserRole = typeof userRolesTable.$inferInsert;
