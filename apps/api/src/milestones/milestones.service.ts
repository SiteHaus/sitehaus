import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ne, isNotNull, schema, type Db } from '@site-haus/db';
import type {
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '@site-haus/validation/forms/milestone';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';
import { NotificationsService } from 'src/notifications/notifications.service';

interface AuditContext {
  userId: string;
  clientId: string;
  ip?: string;
  ua?: string;
}

function serialise(row: typeof schema.milestonesTable.$inferSelect) {
  return {
    ...row,
    dueDate: row.dueDate?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    signedOffAt: row.signedOffAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class MilestonesService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private async resolveProject(projectId: string, clientId: string, isFirstParty: boolean) {
    return this.db.query.projectsTable.findFirst({
      where: isFirstParty
        ? eq(schema.projectsTable.id, projectId)
        : and(
            eq(schema.projectsTable.id, projectId),
            eq(schema.projectsTable.clientId, clientId),
          ),
      columns: { id: true, clientId: true },
    });
  }

  async listUpcoming(clientId: string, isFirstParty: boolean, limit = 5) {
    const rows = await this.db
      .select({
        id: schema.milestonesTable.id,
        projectId: schema.milestonesTable.projectId,
        projectName: schema.projectsTable.name,
        name: schema.milestonesTable.name,
        description: schema.milestonesTable.description,
        status: schema.milestonesTable.status,
        sortOrder: schema.milestonesTable.sortOrder,
        dueDate: schema.milestonesTable.dueDate,
        assigneeId: schema.milestonesTable.assigneeId,
        completedAt: schema.milestonesTable.completedAt,
        signedOffAt: schema.milestonesTable.signedOffAt,
        signedOffBy: schema.milestonesTable.signedOffBy,
        createdAt: schema.milestonesTable.createdAt,
        updatedAt: schema.milestonesTable.updatedAt,
        projectClientId: schema.projectsTable.clientId,
      })
      .from(schema.milestonesTable)
      .innerJoin(
        schema.projectsTable,
        eq(schema.milestonesTable.projectId, schema.projectsTable.id),
      )
      .where(
        and(
          isFirstParty ? undefined : eq(schema.projectsTable.clientId, clientId),
          ne(schema.milestonesTable.status, 'completed'),
          isNotNull(schema.milestonesTable.dueDate),
        ),
      )
      .orderBy(asc(schema.milestonesTable.dueDate))
      .limit(limit);

    return rows.map(({ projectClientId: _projectClientId, ...row }) => ({
      ...row,
      dueDate: row.dueDate?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      signedOffAt: row.signedOffAt?.toISOString() ?? null,
      createdAt: row.createdAt?.toISOString() ?? null,
      updatedAt: row.updatedAt?.toISOString() ?? null,
    }));
  }

  async list(projectId: string, clientId: string, isFirstParty = false) {
    const project = await this.resolveProject(projectId, clientId, isFirstParty);
    if (!project) return null;

    const rows = await this.db.query.milestonesTable.findMany({
      where: eq(schema.milestonesTable.projectId, projectId),
      orderBy: [asc(schema.milestonesTable.sortOrder)],
    });

    return rows.map(serialise);
  }

  async create(
    projectId: string,
    data: CreateMilestoneInput,
    ctx: AuditContext,
    isFirstParty = false,
  ) {
    const project = await this.resolveProject(projectId, ctx.clientId, isFirstParty);
    if (!project) return { error: 'Project not found or access denied' };

    // Auto-assign sortOrder to end of list
    const last = await this.db.query.milestonesTable.findFirst({
      where: eq(schema.milestonesTable.projectId, projectId),
      orderBy: [asc(schema.milestonesTable.sortOrder)],
      columns: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    const [milestone] = await this.db
      .insert(schema.milestonesTable)
      .values({
        projectId,
        name: data.name,
        description: data.description ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId ?? null,
        sortOrder,
      })
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'milestone.created',
      targetType: 'project',
      targetId: projectId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { name: data.name, milestoneId: milestone.id },
    });

    // Notify the client that a new milestone was added
    await this.notifications.enqueue({
      type: 'milestone.created',
      milestoneId: milestone.id,
      milestoneName: milestone.name,
      projectId,
      clientId: project.clientId,
    });

    return serialise(milestone);
  }

  async update(milestoneId: string, data: UpdateMilestoneInput, ctx: AuditContext) {
    const existing = await this.db.query.milestonesTable.findFirst({
      where: eq(schema.milestonesTable.id, milestoneId),
      columns: { id: true, status: true, projectId: true },
    });

    if (!existing) return null;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) updates[key] = value === null ? null : value;
    }

    // When marking completed, set completedAt
    if (data.status === 'completed' && existing.status !== 'completed') {
      updates.completedAt = new Date();
    }
    // When un-completing, clear completedAt
    if (data.status && data.status !== 'completed' && existing.status === 'completed') {
      updates.completedAt = null;
    }

    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const [milestone] = await this.db
      .update(schema.milestonesTable)
      .set(updates)
      .where(eq(schema.milestonesTable.id, milestoneId))
      .returning();

    if (!milestone) return null;

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'milestone.updated',
      targetType: 'project',
      targetId: existing.projectId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { milestoneId, fields: Object.keys(data) },
    });

    // Notify client when milestone is marked complete
    if (data.status === 'completed' && existing.status !== 'completed') {
      const project = await this.db.query.projectsTable.findFirst({
        where: eq(schema.projectsTable.id, existing.projectId),
        columns: { clientId: true },
      });
      if (project) {
        await this.notifications.enqueue({
          type: 'milestone.completed',
          milestoneId: milestone.id,
          milestoneName: milestone.name,
          projectId: existing.projectId,
          clientId: project.clientId,
        });
      }
    }

    return serialise(milestone);
  }

  async delete(milestoneId: string, ctx: AuditContext) {
    const existing = await this.db.query.milestonesTable.findFirst({
      where: eq(schema.milestonesTable.id, milestoneId),
      columns: { id: true, projectId: true },
    });

    if (!existing) return false;

    await this.db
      .delete(schema.milestonesTable)
      .where(eq(schema.milestonesTable.id, milestoneId));

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'milestone.deleted',
      targetType: 'project',
      targetId: existing.projectId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { milestoneId },
    });

    return true;
  }

  async signOff(milestoneId: string, clientId: string, userId: string) {
    const milestone = await this.db.query.milestonesTable.findFirst({
      where: eq(schema.milestonesTable.id, milestoneId),
      with: {
        project: { columns: { id: true, name: true, clientId: true } },
      },
      columns: { id: true, name: true, status: true, signedOffAt: true },
    });

    if (!milestone) return null;
    if (milestone.project.clientId !== clientId) return null;
    if (milestone.status !== 'completed') return { error: 'Milestone is not completed yet' };
    if (milestone.signedOffAt) return { error: 'Milestone already signed off' };

    const [updated] = await this.db
      .update(schema.milestonesTable)
      .set({ signedOffAt: new Date(), signedOffBy: userId, updatedAt: new Date() })
      .where(eq(schema.milestonesTable.id, milestoneId))
      .returning();

    // Notify the assigned employee
    const signingUser = await this.db.query.usersTable.findFirst({
      where: eq(schema.usersTable.id, userId),
      columns: { firstName: true, lastName: true },
    });
    const signedOffByName = [signingUser?.firstName, signingUser?.lastName]
      .filter(Boolean)
      .join(' ') || 'A client';

    await this.notifications.enqueue({
      type: 'milestone.signed_off',
      milestoneId: milestone.id,
      milestoneName: milestone.name,
      projectId: milestone.project.id,
      projectName: milestone.project.name,
      signedOffByName,
    });

    return serialise(updated);
  }

  async reorder(orderedIds: string[], ctx: AuditContext) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.db
          .update(schema.milestonesTable)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(schema.milestonesTable.id, id)),
      ),
    );

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'milestone.reordered',
      targetType: 'project',
      targetId: orderedIds[0] ?? '',
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { count: orderedIds.length },
    });
  }
}
