import { relations } from "drizzle-orm";
import { businessProfilesTable } from "../core/business-profiles.js";
import { projectsTable } from "../core/projects.js";
import { authCodesTable } from "./auth-codes.js";
import { clientRedirectUrisTable, clientsTable } from "./clients.js";
import { rolesTable, userRolesTable } from "./roles.js";
import { sessionsTable } from "./sessions.js";

export const clientsRelations = relations(clientsTable, ({ one, many }) => ({
  redirectUris: many(clientRedirectUrisTable),
  roles: many(rolesTable),
  userRoles: many(userRolesTable),
  sessions: many(sessionsTable),
  authCodes: many(authCodesTable),
  projects: many(projectsTable),
  businessProfile: one(businessProfilesTable),
}));

export const clientRedirectUrisRelations = relations(
  clientRedirectUrisTable,
  ({ one }) => ({
    client: one(clientsTable, {
      fields: [clientRedirectUrisTable.clientId],
      references: [clientsTable.id],
    }),
  })
);
