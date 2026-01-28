import {
  boolean,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const permissionModulesTable = pgTable(
  "permission_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 64 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    description: varchar("description", { length: 255 }),
    isCore: boolean("is_core").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("permission_modules_key_uq").on(t.key)]
);

export type PermissionModule = typeof permissionModulesTable.$inferSelect;
export type NewPermissionModule = typeof permissionModulesTable.$inferInsert;
