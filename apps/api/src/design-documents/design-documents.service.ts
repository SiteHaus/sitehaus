import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  schema,
  type Db,
} from '@site-haus/db';
import type { DesignDocumentStatus } from '@site-haus/db';
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
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['amended'],
  amended: ['in_review'],
};

const userBriefColumns = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

function serialise(row: typeof schema.designDocumentsTable.$inferSelect) {
  return {
    ...row,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

function serialiseVersion(row: typeof schema.designDocumentVersionsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString() ?? null,
  };
}

@Injectable()
export class DesignDocumentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /** Verify projectId belongs to clientId, return project or null. */
  async verifyProjectAccess(projectId: string, clientId: string, isFirstParty = false) {
    return this.db.query.projectsTable.findFirst({
      where: isFirstParty
        ? eq(schema.projectsTable.id, projectId)
        : and(
            eq(schema.projectsTable.id, projectId),
            eq(schema.projectsTable.clientId, clientId),
          ),
      columns: { id: true },
    });
  }

  async getByProjectId(projectId: string) {
    const doc = await this.db.query.designDocumentsTable.findFirst({
      where: eq(schema.designDocumentsTable.projectId, projectId),
      with: {
        approver: { columns: userBriefColumns },
        creator: { columns: userBriefColumns },
      },
    });

    if (!doc) return null;

    return {
      ...serialise(doc),
      approvedBy: doc.approver ?? null,
      createdBy: doc.creator ?? null,
    };
  }

  async create(projectId: string, content: string | undefined, ctx: AuditContext) {
    const existing = await this.db.query.designDocumentsTable.findFirst({
      where: eq(schema.designDocumentsTable.projectId, projectId),
      columns: { id: true },
    });

    if (existing) {
      throw new ConflictException('A design document already exists for this project');
    }

    const [doc] = await this.db
      .insert(schema.designDocumentsTable)
      .values({
        projectId,
        content: content ?? null,
        createdBy: ctx.userId,
        currentVersion: 0,
      })
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'design-document.created',
      targetType: 'design_document',
      targetId: doc.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { projectId },
    });

    // Re-fetch with relations for proper response shape
    return this.getByProjectId(projectId);
  }

  async updateContent(projectId: string, content: string) {
    // Only allow edits when status is draft or amended
    const existing = await this.db.query.designDocumentsTable.findFirst({
      where: eq(schema.designDocumentsTable.projectId, projectId),
      columns: { id: true, status: true },
    });

    if (!existing) return null;

    if (existing.status !== 'draft' && existing.status !== 'amended') {
      return {
        error: `Cannot edit content while status is "${existing.status}". Move to "amended" first.`,
      };
    }

    await this.db
      .update(schema.designDocumentsTable)
      .set({ content, updatedAt: new Date() })
      .where(eq(schema.designDocumentsTable.projectId, projectId));

    return this.getByProjectId(projectId);
  }

  async publish(projectId: string, changeNote: string | undefined, ctx: AuditContext) {
    const doc = await this.db.query.designDocumentsTable.findFirst({
      where: eq(schema.designDocumentsTable.projectId, projectId),
      columns: { id: true, content: true, currentVersion: true },
    });

    if (!doc) return null;

    const nextVersion = doc.currentVersion + 1;

    // Create immutable version snapshot
    const [version] = await this.db
      .insert(schema.designDocumentVersionsTable)
      .values({
        designDocumentId: doc.id,
        version: nextVersion,
        content: doc.content ?? '',
        changeNote: changeNote ?? null,
        createdBy: ctx.userId,
      })
      .returning();

    // Increment the version counter
    await this.db
      .update(schema.designDocumentsTable)
      .set({ currentVersion: nextVersion, updatedAt: new Date() })
      .where(eq(schema.designDocumentsTable.id, doc.id));

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'design-document.published',
      targetType: 'design_document',
      targetId: doc.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { version: nextVersion, changeNote },
    });

    return this.getByProjectId(projectId);
  }

  async transitionStatus(
    projectId: string,
    newStatus: DesignDocumentStatus,
    ctx: AuditContext,
  ) {
    const existing = await this.db.query.designDocumentsTable.findFirst({
      where: eq(schema.designDocumentsTable.projectId, projectId),
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

    if (newStatus === 'approved') {
      updates.approvedAt = new Date();
      updates.approvedBy = ctx.userId;
    }
    if (newStatus === 'amended') {
      updates.approvedAt = null;
      updates.approvedBy = null;
    }

    await this.db
      .update(schema.designDocumentsTable)
      .set(updates)
      .where(eq(schema.designDocumentsTable.id, existing.id));

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'design-document.status_changed',
      targetType: 'design_document',
      targetId: existing.id,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { from: existing.status, to: newStatus },
    });

    return this.getByProjectId(projectId);
  }

  async listVersions(designDocumentId: string) {
    const versions = await this.db.query.designDocumentVersionsTable.findMany({
      where: eq(schema.designDocumentVersionsTable.designDocumentId, designDocumentId),
      orderBy: [desc(schema.designDocumentVersionsTable.version)],
      columns: {
        id: true,
        designDocumentId: true,
        version: true,
        changeNote: true,
        createdBy: true,
        createdAt: true,
      },
      with: {
        creator: { columns: userBriefColumns },
      },
    });

    return versions.map((v) => ({
      ...serialiseVersion(v as unknown as typeof schema.designDocumentVersionsTable.$inferSelect),
      content: '', // Omit full content from list
      createdBy: v.creator ?? null,
    }));
  }

  async getVersion(designDocumentId: string, version: number) {
    const row = await this.db.query.designDocumentVersionsTable.findFirst({
      where: and(
        eq(schema.designDocumentVersionsTable.designDocumentId, designDocumentId),
        eq(schema.designDocumentVersionsTable.version, version),
      ),
      with: {
        creator: { columns: userBriefColumns },
      },
    });

    if (!row) return null;

    return {
      ...serialiseVersion(row),
      createdBy: row.creator ?? null,
    };
  }
}
