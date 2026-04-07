import { relations } from "drizzle-orm";
import { totpCredentialsTable } from "./totp-credentials.js";
import { usersTable } from "./users.js";

export const totpCredentialsRelations = relations(totpCredentialsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [totpCredentialsTable.userId],
    references: [usersTable.id],
  }),
}));
