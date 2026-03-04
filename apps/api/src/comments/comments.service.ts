import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  desc,
  eq,
  lt,
  schema,
  type Db,
} from '@site-haus/db';
import type { CommentTargetType } from '@site-haus/db';
import type {
  CreateCommentInput,
  ListCommentsQuery,
} from '@site-haus/validation/forms/comment';
import { AuditService } from 'src/audit/audit.service';
import { DRIZZLE } from 'src/db/tokens';
import { NotificationsService } from 'src/notifications/notifications.service';

interface AuditContext {
  userId: string;
  clientId: string;
  isFirstParty: boolean;
  ip?: string;
  ua?: string;
}

const authorColumns = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

function serialise(row: typeof schema.commentsTable.$inferSelect) {
  return {
    ...row,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Resolve the owning clientId for a polymorphic target.
   * Returns the clientId or null if the target doesn't exist.
   */
  async resolveTargetClientId(
    targetType: CommentTargetType,
    targetId: string,
  ): Promise<string | null> {
    switch (targetType) {
      case 'project': {
        const row = await this.db.query.projectsTable.findFirst({
          where: eq(schema.projectsTable.id, targetId),
          columns: { clientId: true },
        });
        return row?.clientId ?? null;
      }
      case 'ticket': {
        const row = await this.db.query.ticketsTable.findFirst({
          where: eq(schema.ticketsTable.id, targetId),
          with: { project: { columns: { clientId: true } } },
          columns: { id: true },
        });
        return row?.project?.clientId ?? null;
      }
      case 'design_document': {
        const row = await this.db.query.designDocumentsTable.findFirst({
          where: eq(schema.designDocumentsTable.id, targetId),
          with: { project: { columns: { clientId: true } } },
          columns: { id: true },
        });
        return row?.project?.clientId ?? null;
      }
      default:
        return null;
    }
  }

  /**
   * Resolve a comment's target type, targetId, and owning clientId.
   * Used to build correct audit context for update/delete.
   */
  async resolveCommentTarget(
    commentId: string,
  ): Promise<{ targetType: CommentTargetType; targetId: string; targetClientId: string | null } | null> {
    const comment = await this.db.query.commentsTable.findFirst({
      where: eq(schema.commentsTable.id, commentId),
      columns: { id: true, targetType: true, targetId: true },
    });
    if (!comment) return null;

    const targetClientId = await this.resolveTargetClientId(comment.targetType, comment.targetId);
    return { targetType: comment.targetType, targetId: comment.targetId, targetClientId };
  }

  async list(
    filters: ListCommentsQuery,
    clientId: string,
    isEmployee: boolean,
  ) {
    const { targetType, targetId, limit = 50, cursor } = filters;

    const conditions = [
      eq(schema.commentsTable.targetType, targetType),
      eq(schema.commentsTable.targetId, targetId),
    ];

    // Non-employees cannot see internal comments
    if (!isEmployee) {
      conditions.push(eq(schema.commentsTable.isInternal, false));
    }

    if (cursor) {
      const cursorRow = await this.db.query.commentsTable.findFirst({
        where: eq(schema.commentsTable.id, cursor),
        columns: { createdAt: true },
      });
      if (cursorRow?.createdAt) {
        conditions.push(lt(schema.commentsTable.createdAt, cursorRow.createdAt));
      }
    }

    const rows = await this.db.query.commentsTable.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.commentsTable.createdAt)],
      limit: limit + 1,
      with: {
        author: { columns: authorColumns },
      },
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      comments: items.map((c) => ({
        ...serialise(c),
        author: c.author ?? null,
      })),
      nextCursor,
    };
  }

  async create(data: CreateCommentInput, ctx: AuditContext) {
    // If threading, validate parent comment exists and belongs to same target
    if (data.parentId) {
      const parent = await this.db.query.commentsTable.findFirst({
        where: eq(schema.commentsTable.id, data.parentId),
        columns: { id: true, targetType: true, targetId: true },
      });

      if (!parent) {
        return { error: 'Parent comment not found' };
      }
      if (parent.targetType !== data.targetType || parent.targetId !== data.targetId) {
        return { error: 'Parent comment belongs to a different target' };
      }
    }

    const [comment] = await this.db
      .insert(schema.commentsTable)
      .values({
        targetType: data.targetType,
        targetId: data.targetId,
        authorId: ctx.userId,
        body: data.body,
        isInternal: data.isInternal ?? false,
        parentId: data.parentId ?? null,
      })
      .returning();

    // Resolve the owning client so the audit log appears in the correct client's history
    const resolvedClientId = await this.resolveTargetClientId(data.targetType, data.targetId);

    await this.audit.log({
      clientId: resolvedClientId ?? ctx.clientId,
      userId: ctx.userId,
      action: 'comment.created',
      targetType: data.targetType,
      targetId: data.targetId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: {
        commentId: comment.id,
        isInternal: comment.isInternal,
        isReply: !!data.parentId,
      },
    });

    // Notify the other party — skip internal comments (client can't see them)
    if (!comment.isInternal) {
      const [author, targetClientId] = await Promise.all([
        this.db.query.usersTable.findFirst({
          where: eq(schema.usersTable.id, ctx.userId),
          columns: { firstName: true, lastName: true },
        }),
        this.resolveTargetClientId(data.targetType, data.targetId),
      ]);
      const authorName = [author?.firstName, author?.lastName].filter(Boolean).join(' ') || 'Someone';
      const targetLabel = `${data.targetType.replace('_', ' ')}: ${data.targetId}`;
      const bodyPreview = data.body.slice(0, 200) + (data.body.length > 200 ? '…' : '');

      await this.notifications.enqueue({
        type: 'comment.created',
        commentId: comment.id,
        authorId: ctx.userId,
        authorName,
        bodyPreview,
        targetType: data.targetType,
        targetId: data.targetId,
        targetLabel,
        targetClientId: targetClientId ?? ctx.clientId,
        isEmployeeAuthor: ctx.isFirstParty,
      });
    }

    // Re-fetch with author relation
    const full = await this.db.query.commentsTable.findFirst({
      where: eq(schema.commentsTable.id, comment.id),
      with: { author: { columns: authorColumns } },
    });

    return {
      ...serialise(full!),
      author: full!.author ?? null,
    };
  }

  async update(commentId: string, body: string, ctx: AuditContext) {
    // Verify comment exists and belongs to the caller
    const existing = await this.db.query.commentsTable.findFirst({
      where: eq(schema.commentsTable.id, commentId),
      columns: { id: true, authorId: true, targetType: true, targetId: true },
    });

    if (!existing) return null;

    // Only the author can edit their own comment
    if (existing.authorId !== ctx.userId) {
      return { error: 'You can only edit your own comments' };
    }

    const [updated] = await this.db
      .update(schema.commentsTable)
      .set({ body, updatedAt: new Date() })
      .where(eq(schema.commentsTable.id, commentId))
      .returning();

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'comment.updated',
      targetType: existing.targetType,
      targetId: existing.targetId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { commentId },
    });

    const full = await this.db.query.commentsTable.findFirst({
      where: eq(schema.commentsTable.id, updated.id),
      with: { author: { columns: authorColumns } },
    });

    return {
      ...serialise(full!),
      author: full!.author ?? null,
    };
  }

  async remove(commentId: string, ctx: AuditContext) {
    const existing = await this.db.query.commentsTable.findFirst({
      where: eq(schema.commentsTable.id, commentId),
      columns: { id: true, authorId: true, targetType: true, targetId: true },
    });

    if (!existing) return null;

    // Authors can delete their own; employees with manage can delete any
    // (permission check happens in controller — here we just do the soft delete)

    // Soft delete: replace body with "[deleted]"
    await this.db
      .update(schema.commentsTable)
      .set({ body: '[deleted]', updatedAt: new Date() })
      .where(eq(schema.commentsTable.id, commentId));

    await this.audit.log({
      clientId: ctx.clientId,
      userId: ctx.userId,
      action: 'comment.deleted',
      targetType: existing.targetType,
      targetId: existing.targetId,
      ip: ctx.ip,
      ua: ctx.ua,
      meta: { commentId },
    });

    return true;
  }
}
