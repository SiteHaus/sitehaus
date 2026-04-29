import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../iam/users.js";
import { ticketsTable } from "./tickets.js";

export const ticketAttachmentsTable = pgTable(
  "ticket_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => ticketsTable.id, { onDelete: "cascade" }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSize: integer("file_size").notNull(),
    storageKey: text("storage_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("ticket_attachments_ticket_idx").on(t.ticketId)],
);

export type TicketAttachment = typeof ticketAttachmentsTable.$inferSelect;
export type NewTicketAttachment = typeof ticketAttachmentsTable.$inferInsert;
