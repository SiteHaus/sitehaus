import { relations } from "drizzle-orm";
import { auditLogTable, projectsTable } from "../schema.js";
import { devicesTable } from "./devices.js";
import { otpsTable } from "./otps.js";
import { passwordCredentialsTable } from "./password-credentials.js";
import { userRolesTable } from "./roles.js";
import { sessionsTable } from "./sessions.js";
import { usersTable } from "./users.js";

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  passwordCredential: one(passwordCredentialsTable, {
    fields: [usersTable.id],
    references: [passwordCredentialsTable.userId],
  }),
  sessions: many(sessionsTable),
  devices: many(devicesTable),
  otps: many(otpsTable),
  userRoles: many(userRolesTable),
  auditLogs: many(auditLogTable),
  projects: many(projectsTable),
}));
