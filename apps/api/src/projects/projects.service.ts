import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  ilike,
  lt,
  or,
  schema,
  sql,
  type Db,
} from '@site-haus/db';
import type { CreateProjectInput, ListProjectsQuery } from '@site-haus/validation/forms/project';
import type { ProjectStatus } from '@site-haus/db';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';

interface AuditContext {
  userId: string;
  clientId?: string;
  ip?: string;
  ua?: string;
}

/** Valid status transitions: from → allowed targets */
const STATUS_TRANSITIONS: Record<string, string[]> = {
  submitted: ['in_progress', 'cancelled'],
  in_progress: ['launched', 'cancelled'],
  launched: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  async list(filters: ListProjectsQuery, clientId: string, isFirstParty = false) {
    const { status, type, clientId: filterClientId, search, limit = 50, cursor } = filters;

    // First-party (SiteHaus staff with no x-client-id) sees all projects.
    // Third-party clients are scoped to their own clientId.
    const conditions = isFirstParty
      ? []
      : [eq(schema.projectsTable.clientId, clientId)];

    // Explicit clientId filter (staff filtering by a specific client)
    if (filterClientId) {
      conditions.push(eq(schema.projectsTable.clientId, filterClientId));
    }

    if (status) {
      conditions.push(eq(schema.projectsTable.status, status));
    }
    if (type) {
      conditions.push(eq(schema.projectsTable.type, type));
    }
    if (search) {
      conditions.push(
        or(
          ilike(schema.projectsTable.name, `%${search}%`),
          ilike(schema.projectsTable.description, `%${search}%`),
        )!,
      );
    }

    if (cursor) {
      const cursorRow = await this.db.query.projectsTable.findFirst({
        where: (t, { eq: _eq }) => _eq(t.id, cursor),
        columns: { updatedAt: true },
      });
      if (cursorRow?.updatedAt) {
        conditions.push(lt(schema.projectsTable.updatedAt, cursorRow.updatedAt));
      }
    }

    const rows = await this.db.query.projectsTable.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: [desc(schema.projectsTable.updatedAt)],
      limit: limit + 1,
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      projects: items.map((p) => ({
        ...p,
        createdAt: p.createdAt?.toISOString() ?? null,
        updatedAt: p.updatedAt?.toISOString() ?? null,
        startDate: p.startDate?.toISOString() ?? null,
        dueDate: p.dueDate?.toISOString() ?? null,
        launchedAt: p.launchedAt?.toISOString() ?? null,
      })),
      nextCursor,
    };
  }

  async getById(projectId: string, clientId: string, isFirstParty = false) {
    const project = await this.db.query.projectsTable.findFirst({
      where: isFirstParty
        ? eq(schema.projectsTable.id, projectId)
        : and(
            eq(schema.projectsTable.id, projectId),
            eq(schema.projectsTable.clientId, clientId),
          ),
      with: {
        client: { columns: { id: true, name: true } },
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isVerified: true,
            status: true,
          },
        },
      },
    });

    if (!project) return null;

    // Count milestones and tickets
    const [milestoneCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.milestonesTable)
      .where(eq(schema.milestonesTable.projectId, projectId));

    const [ticketCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.ticketsTable)
      .where(eq(schema.ticketsTable.projectId, projectId));

    const [openTicketCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.ticketsTable)
      .where(
        and(
          eq(schema.ticketsTable.projectId, projectId),
          eq(schema.ticketsTable.status, 'open'),
        ),
      );

    return {
      ...project,
      createdAt: project.createdAt?.toISOString() ?? null,
      updatedAt: project.updatedAt?.toISOString() ?? null,
      startDate: project.startDate?.toISOString() ?? null,
      dueDate: project.dueDate?.toISOString() ?? null,
      launchedAt: project.launchedAt?.toISOString() ?? null,
      creator: project.user,
      milestoneCount: milestoneCount?.count ?? 0,
      ticketCount: ticketCount?.count ?? 0,
      openTicketCount: openTicketCount?.count ?? 0,
    };
  }

  async create(
    data: CreateProjectInput,
    ctx: AuditContext,
  ) {
    const [project] = await this.db
      .insert(schema.projectsTable)
      .values({
        clientId: data.clientId,
        userId: ctx.userId,
        name: data.name,
        description: data.description ?? null,
        type: data.type,
        siteDomain: data.siteDomain ?? null,
        stagingDomain: data.stagingDomain ?? null,
        repoUrl: data.repoUrl ?? null,
        monthlyRateCents: data.monthlyRateCents ?? null,
        depositAmountCents: data.depositAmountCents ?? null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      })
      .returning();

    await this.audit.log({
      clientId: data.clientId,
      userId: ctx.userId,
      action: 'project.created',
      targetType: 'project',
      targetId: project.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { name: data.name, type: data.type },
    });

    return {
      ...project,
      createdAt: project.createdAt?.toISOString() ?? null,
      updatedAt: project.updatedAt?.toISOString() ?? null,
      startDate: project.startDate?.toISOString() ?? null,
      dueDate: project.dueDate?.toISOString() ?? null,
      launchedAt: project.launchedAt?.toISOString() ?? null,
    };
  }

  async update(
    projectId: string,
    clientId: string,
    data: Record<string, unknown>,
    ctx: AuditContext,
  ) {
    // Build the update payload, converting date strings to Date objects
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'startDate' || key === 'dueDate') {
        updates[key] = value ? new Date(value as string) : null;
      } else {
        updates[key] = value;
      }
    }
    updates.updatedAt = new Date();

    const [project] = await this.db
      .update(schema.projectsTable)
      .set(updates)
      .where(
        and(
          eq(schema.projectsTable.id, projectId),
          eq(schema.projectsTable.clientId, clientId),
        ),
      )
      .returning();

    if (!project) return null;

    await this.audit.log({
      clientId,
      userId: ctx.userId,
      action: 'project.updated',
      targetType: 'project',
      targetId: projectId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { fields: Object.keys(data) },
    });

    return {
      ...project,
      createdAt: project.createdAt?.toISOString() ?? null,
      updatedAt: project.updatedAt?.toISOString() ?? null,
      startDate: project.startDate?.toISOString() ?? null,
      dueDate: project.dueDate?.toISOString() ?? null,
      launchedAt: project.launchedAt?.toISOString() ?? null,
    };
  }

  async transitionStatus(
    projectId: string,
    clientId: string,
    newStatus: ProjectStatus,
    ctx: AuditContext,
  ) {
    const existing = await this.db.query.projectsTable.findFirst({
      where: and(
        eq(schema.projectsTable.id, projectId),
        eq(schema.projectsTable.clientId, clientId),
      ),
      columns: { id: true, status: true },
    });

    if (!existing) return null;

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

    if (newStatus === 'launched') {
      updates.launchedAt = new Date();
    }
    if (newStatus === 'cancelled') {
      updates.isActive = false;
    }

    const [project] = await this.db
      .update(schema.projectsTable)
      .set(updates)
      .where(eq(schema.projectsTable.id, projectId))
      .returning();

    await this.audit.log({
      clientId,
      userId: ctx.userId,
      action: 'project.status_changed',
      targetType: 'project',
      targetId: projectId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { from: existing.status, to: newStatus },
    });

    return {
      ...project,
      createdAt: project.createdAt?.toISOString() ?? null,
      updatedAt: project.updatedAt?.toISOString() ?? null,
      startDate: project.startDate?.toISOString() ?? null,
      dueDate: project.dueDate?.toISOString() ?? null,
      launchedAt: project.launchedAt?.toISOString() ?? null,
    };
  }

  async cancel(
    projectId: string,
    clientId: string,
    ctx: AuditContext,
  ): Promise<boolean> {
    const [project] = await this.db
      .update(schema.projectsTable)
      .set({
        status: 'cancelled',
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.projectsTable.id, projectId),
          eq(schema.projectsTable.clientId, clientId),
        ),
      )
      .returning({ id: schema.projectsTable.id });

    if (!project) return false;

    await this.audit.log({
      clientId,
      userId: ctx.userId,
      action: 'project.cancelled',
      targetType: 'project',
      targetId: projectId,
      ip: ctx.ip,
      ua: ctx.ua,
    });

    return true;
  }
}
