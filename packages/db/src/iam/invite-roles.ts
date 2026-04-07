import { index, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { invitesTable } from "./invites.js";
import { rolesTable } from "./roles.js";

export const inviteRolesTable = pgTable(
  "invite_roles",
  {
    inviteId: uuid("invite_id")
      .notNull()
      .references(() => invitesTable.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.inviteId, t.roleId], name: "invite_roles_pk" }),
    index("invite_roles_role_idx").on(t.roleId),
  ],
);

export type InviteRole = typeof inviteRolesTable.$inferSelect;
export type NewInviteRole = typeof inviteRolesTable.$inferInsert;
