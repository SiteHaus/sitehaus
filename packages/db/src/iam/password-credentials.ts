import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const passwordCredentialsTable = pgTable("password_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  version: varchar("version", { length: 32 }).notNull().default("argon2id-1"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PasswordCredential = typeof passwordCredentialsTable.$inferSelect;
export type NewPasswordCredential =
  typeof passwordCredentialsTable.$inferInsert;
