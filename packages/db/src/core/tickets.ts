import {
  ticketPriorityValues,
  ticketStatusValues,
  ticketTypeValues,
} from "@site-haus/validation/core/enums";
import { index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "../iam/users.js";
import { projectsTable } from "./projects.js";

export const ticketTypeEnum = pgEnum("ticket_type", ticketTypeValues);
export const ticketPriorityEnum = pgEnum("ticket_priority", ticketPriorityValues);
export const ticketStatusEnum = pgEnum("ticket_status", ticketStatusValues);

export const ticketsTable = pgTable(
  "tickets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: integer("number").notNull().default(0),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    type: ticketTypeEnum("type").default("request").notNull(),
    priority: ticketPriorityEnum("priority").default("normal").notNull(),
    status: ticketStatusEnum("status").default("open").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "set null" }),
    assigneeId: uuid("assignee_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("tickets_project_idx").on(t.projectId),
    index("tickets_author_idx").on(t.authorId),
    index("tickets_assignee_idx").on(t.assigneeId),
    index("tickets_status_idx").on(t.status),
  ],
);

export type TicketType = (typeof ticketTypeEnum.enumValues)[number];
export type TicketPriority = (typeof ticketPriorityEnum.enumValues)[number];
export type TicketStatus = (typeof ticketStatusEnum.enumValues)[number];

export type Ticket = typeof ticketsTable.$inferSelect;
export type NewTicket = typeof ticketsTable.$inferInsert;
