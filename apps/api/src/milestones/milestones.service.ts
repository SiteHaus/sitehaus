import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, schema, type Db } from '@site-haus/db';
import type {
  CreateMilestoneInput,
  UpdateMilestoneInput,
} from '@site-haus/validation/forms/milestone';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';

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
      with: { project: { columns: { clientId: true } } },
      columns: { id: true, status: true, signedOffAt: true },
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
