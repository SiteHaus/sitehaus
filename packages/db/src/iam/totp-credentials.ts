import { pgTable, text, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

/**
 * TOTP credentials for two-factor authentication.
 * Stores encrypted TOTP secret and backup codes for each user.
 */
export const totpCredentialsTable = pgTable("totp_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  /**
   * TOTP secret encrypted with application secret.
   * Decrypted at runtime when verifying codes.
   */
  secretEncrypted: text("secret_encrypted").notNull(),
  /**
   * Hashed backup codes for account recovery.
   * Each code can only be used once.
   */
  backupCodesHashed: jsonb("backup_codes_hashed").$type<string[]>().notNull(),
  enabledAt: timestamp("enabled_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type TotpCredential = typeof totpCredentialsTable.$inferSelect;
export type NewTotpCredential = typeof totpCredentialsTable.$inferInsert;
