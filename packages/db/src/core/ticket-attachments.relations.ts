import { relations } from "drizzle-orm";
import { usersTable } from "../iam/users.js";
import { ticketAttachmentsTable } from "./ticket-attachments.js";
import { ticketsTable } from "./tickets.js";

export const ticketAttachmentsRelations = relations(ticketAttachmentsTable, ({ one }) => ({
  ticket: one(ticketsTable, {
    fields: [ticketAttachmentsTable.ticketId],
    references: [ticketsTable.id],
  }),
  uploader: one(usersTable, {
    fields: [ticketAttachmentsTable.uploadedBy],
    references: [usersTable.id],
  }),
}));
