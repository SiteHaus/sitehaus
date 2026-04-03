import { relations } from "drizzle-orm";
import { passwordCredentialsTable } from "./password-credentials.js";
import { usersTable } from "./users.js";

export const passwordCredentialsRelations = relations(passwordCredentialsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [passwordCredentialsTable.userId],
    references: [usersTable.id],
  }),
}));
