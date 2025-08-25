import { relations } from "drizzle-orm";
import { otpsTable } from "./otps.js";
import { usersTable } from "./users.js";

export const otpsRelations = relations(otpsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [otpsTable.userId],
    references: [usersTable.id],
  }),
}));
