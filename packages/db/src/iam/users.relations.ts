import { relations } from "drizzle-orm";
import { auditLogTable } from "../core/audit-logs.js";
import { commentsTable } from "../core/comments.js";
import { milestonesTable } from "../core/milestones.js";
import { projectsTable } from "../core/projects.js";
import { ticketsTable } from "../core/tickets.js";
import { devicesTable } from "./devices.js";
import { otpsTable } from "./otps.js";
import { passwordCredentialsTable } from "./password-credentials.js";
import { userRolesTable } from "./roles.js";
import { sessionsTable } from "./sessions.js";
import { totpCredentialsTable } from "./totp-credentials.js";
import { usersTable } from "./users.js";

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  passwordCredential: one(passwordCredentialsTable, {
    fields: [usersTable.id],
    references: [passwordCredentialsTable.userId],
  }),
  totpCredential: one(totpCredentialsTable, {
    fields: [usersTable.id],
    references: [totpCredentialsTable.userId],
  }),
  sessions: many(sessionsTable),
  devices: many(devicesTable),
  otps: many(otpsTable),
  userRoles: many(userRolesTable),
  auditLogs: many(auditLogTable),
  projects: many(projectsTable),
  authoredTickets: many(ticketsTable, { relationName: "ticketAuthor" }),
  assignedTickets: many(ticketsTable, { relationName: "ticketAssignee" }),
  assignedMilestones: many(milestonesTable, {
    relationName: "milestoneAssignee",
  }),
  comments: many(commentsTable),
}));
