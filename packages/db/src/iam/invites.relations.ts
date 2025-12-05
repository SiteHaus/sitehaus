import { relations } from "drizzle-orm";
import { inviteRolesTable } from "./invite-roles.js";
import { invitesTable } from "./invites.js";
import { rolesTable } from "./roles.js";

export const invitesRelations = relations(invitesTable, ({ many }) => ({
  inviteRoles: many(inviteRolesTable),
}));

export const inviteRolesRelations = relations(inviteRolesTable, ({ one }) => ({
  invite: one(invitesTable, {
    fields: [inviteRolesTable.inviteId],
    references: [invitesTable.id],
  }),
  role: one(rolesTable, {
    fields: [inviteRolesTable.roleId],
    references: [rolesTable.id],
  }),
}));
