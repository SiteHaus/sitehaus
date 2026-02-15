import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  lt,
  or,
  schema,
  sql,
  type Db,
} from '@site-haus/db';
import type { TicketStatus } from '@site-haus/db';
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from '@site-haus/validation/forms/ticket';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';

interface AuditContext {
  userId: string;
  clientId: string;
  ip?: string;
  ua?: string;
}

/** Valid status transitions: from → allowed targets */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'open'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

function serialise(row: typeof schema.ticketsTable.$inferSelect) {
  return {
    ...row,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class TicketsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /**
   * Resolve project IDs that belong to a client.
   * Used for scoping ticket access — clients only see tickets on their projects.
   */
  private async projectIdsForClient(clientId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: schema.projectsTable.id })
      .from(schema.projectsTable)
      .where(eq(schema.projectsTable.clientId, clientId));
    return rows.map((r) => r.id);
  }

  async list(filters: ListTicketsQuery, clientId: string) {
    const {
      projectId,
      status,
      type,
      priority,
      assigneeId,
      search,
      limit = 50,
      cursor,
    } = filters;

    const conditions = [];

    // Scope to client's projects
    if (projectId) {
      conditions.push(eq(schema.ticketsTable.projectId, projectId));
    } else {
      // Client-level scoping: restrict to projects owned by the client
      const projectIds = await this.projectIdsForClient(clientId);
      if (projectIds.length === 0) {
        return { tickets: [], nextCursor: undefined };
      }
      conditions.push(inArray(schema.ticketsTable.projectId, projectIds));
    }

    if (status) {
      conditions.push(eq(schema.ticketsTable.status, status));
    }
    if (type) {
      conditions.push(eq(schema.ticketsTable.type, type));
    }
    if (priority) {
      conditions.push(eq(schema.ticketsTable.priority, priority));
    }
    if (assigneeId) {
      conditions.push(eq(schema.ticketsTable.assigneeId, assigneeId));
    }
    if (search) {
      conditions.push(
        or(
          ilike(schema.ticketsTable.title, `%${search}%`),
          ilike(schema.ticketsTable.description, `%${search}%`),
        )!,
      );
    }

    if (cursor) {
      const cursorRow = await this.db.query.ticketsTable.findFirst({
        where: eq(schema.ticketsTable.id, cursor),
        columns: { createdAt: true },
      });
      if (cursorRow?.createdAt) {
        conditions.push(lt(schema.ticketsTable.createdAt, cursorRow.createdAt));
      }
    }

    const rows = await this.db.query.ticketsTable.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(schema.ticketsTable.createdAt)],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      tickets: items.map(serialise),
      nextCursor,
    };
  }

  async getById(ticketId: string, clientId: string) {
    const ticket = await this.db.query.ticketsTable.findFirst({
      where: eq(schema.ticketsTable.id, ticketId),
      with: {
        project: { columns: { id: true, name: true, clientId: true } },
        author: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignee: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!ticket) return null;

    // Access check: ticket's project must belong to caller's client
    if (ticket.project.clientId !== clientId) return null;

    const [commentCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.commentsTable)
      .where(
        and(
          eq(schema.commentsTable.targetType, 'ticket'),
          eq(schema.commentsTable.targetId, ticketId),
        ),
      );

    return {
      ...serialise(ticket),
      author: ticket.author ?? null,
      assignee: ticket.assignee ?? null,
      projectName: ticket.project.name,
      commentCount: commentCount?.count ?? 0,
    };
  }

  async create(data: CreateTicketInput, ctx: AuditContext) {
    // Verify project belongs to the caller's client
    const project = await this.db.query.projectsTable.findFirst({
      where: and(
        eq(schema.projectsTable.id, data.projectId),
        eq(schema.projectsTable.clientId, ctx.clientId),
      ),
      columns: { id: true },
    });

    if (!project) return { error: 'Project not found or access denied' };

    const [ticket] = await this.db
      .insert(schema.ticketsTable)
      .values({
        projectId: data.projectId,
        title: data.title,
        description: data.description ?? null,
        type: data.type ?? 'request',
        priority: data.priority ?? 'normal',
        authorId: ctx.userId,
      })
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'ticket.created',
      targetType: 'ticket',
      targetId: ticket.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { title: data.title, projectId: data.projectId },
    });

    return serialise(ticket);
  }

  async update(
    ticketId: string,
    clientId: string,
    data: UpdateTicketInput,
    ctx: AuditContext,
  ) {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      updates[key] = value;
    }
    updates.updatedAt = new Date();

    // Join with project to enforce client scoping
    const existing = await this.db.query.ticketsTable.findFirst({
      where: eq(schema.ticketsTable.id, ticketId),
      with: { project: { columns: { clientId: true } } },
      columns: { id: true, authorId: true },
    });

    if (!existing || existing.project.clientId !== clientId) return null;

    const [ticket] = await this.db
      .update(schema.ticketsTable)
      .set(updates)
      .where(eq(schema.ticketsTable.id, ticketId))
      .returning();

    if (!ticket) return null;

    await this.audit.log({
      clientId,
      userId: ctx.userId,
      action: 'ticket.updated',
      targetType: 'ticket',
      targetId: ticketId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { fields: Object.keys(data) },
    });

    return serialise(ticket);
  }

  async transitionStatus(
    ticketId: string,
    clientId: string,
    newStatus: TicketStatus,
    ctx: AuditContext,
  ) {
    const existing = await this.db.query.ticketsTable.findFirst({
      where: eq(schema.ticketsTable.id, ticketId),
      with: { project: { columns: { clientId: true } } },
      columns: { id: true, status: true },
    });

    if (!existing || existing.project.clientId !== clientId) return null;

    const allowed = STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return {
        error: `Cannot transition from "${existing.status}" to "${newStatus}". Allowed: ${allowed.join(', ') || 'none'}`,
      };
    }

    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'resolved' || newStatus === 'closed') {
      updates.closedAt = new Date();
    }
    if (newStatus === 'open') {
      updates.closedAt = null;
    }

    const [ticket] = await this.db
      .update(schema.ticketsTable)
      .set(updates)
      .where(eq(schema.ticketsTable.id, ticketId))
      .returning();

    await this.audit.log({
      clientId,
      userId: ctx.userId,
      action: 'ticket.status_changed',
      targetType: 'ticket',
      targetId: ticketId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { from: existing.status, to: newStatus },
    });

    return serialise(ticket);
  }

  async assign(
    ticketId: string,
    clientId: string,
    assigneeId: string | null,
    ctx: AuditContext,
  ) {
    const existing = await this.db.query.ticketsTable.findFirst({
      where: eq(schema.ticketsTable.id, ticketId),
      with: { project: { columns: { clientId: true } } },
      columns: { id: true },
    });

    if (!existing || existing.project.clientId !== clientId) return null;

    // If assigning, verify the user exists
    if (assigneeId) {
      const user = await this.db.query.usersTable.findFirst({
        where: eq(schema.usersTable.id, assigneeId),
        columns: { id: true },
      });
      if (!user) return { error: 'Assignee not found' };
    }

    const [ticket] = await this.db
      .update(schema.ticketsTable)
      .set({ assigneeId, updatedAt: new Date() })
      .where(eq(schema.ticketsTable.id, ticketId))
      .returning();

    await this.audit.log({
      clientId,
      userId: ctx.userId,
      action: assigneeId ? 'ticket.assigned' : 'ticket.unassigned',
      targetType: 'ticket',
      targetId: ticketId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: assigneeId ? { assigneeId } : {},
    });

    return serialise(ticket);
  }
}
