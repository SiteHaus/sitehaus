import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, lt, schema, type Db } from '@site-haus/db';
import { CryptoService } from 'src/crypto/crypto.service';
import { DRIZZLE } from 'src/db/tokens';

export interface AuditLogInput {
  clientId: string;
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  ua?: string;
  meta?: Record<string, unknown>;
}

export interface AuditListFilters {
  startDate?: Date;
  endDate?: Date;
  action?: string;
  targetType?: string;
  targetId?: string;
  userId?: string;
  limit?: number;
  cursor?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly crypto: CryptoService,
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    const ipHash = input.ip ? this.crypto.sha256b64url(input.ip) : null;
    const uaHash = input.ua ? this.crypto.sha256b64url(input.ua) : null;

    await this.db.insert(schema.auditLogTable).values({
      clientId: input.clientId,
      userId: input.userId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      ipHash,
      uaHash,
      meta: input.meta ?? null,
    });
  }

  async listForClient(clientId: string, filters: AuditListFilters = {}) {
    const {
      startDate,
      endDate,
      action,
      targetType,
      targetId,
      userId,
      limit = 50,
      cursor,
    } = filters;

    const conditions = [eq(schema.auditLogTable.clientId, clientId)];

    if (startDate) {
      conditions.push(gt(schema.auditLogTable.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lt(schema.auditLogTable.createdAt, endDate));
    }
    if (action) {
      conditions.push(eq(schema.auditLogTable.action, action));
    }
    if (targetType) {
      conditions.push(eq(schema.auditLogTable.targetType, targetType));
    }
    if (targetId) {
      conditions.push(eq(schema.auditLogTable.targetId, targetId));
    }
    if (userId) {
      conditions.push(eq(schema.auditLogTable.userId, userId));
    }
    if (cursor) {
      const cursorLog = await this.db.query.auditLogTable.findFirst({
        where: (t, { eq: _eq }) => _eq(t.id, cursor),
        columns: { createdAt: true },
      });
      if (cursorLog) {
        conditions.push(
          lt(schema.auditLogTable.createdAt, cursorLog.createdAt),
        );
      }
    }

    const logs = await this.db.query.auditLogTable.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.auditLogTable.createdAt)],
      limit: limit + 1,
      with: {
        user: {
          columns: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      logs: items.map((log) => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        ipHash: log.ipHash,
        meta: log.meta,
        createdAt: log.createdAt.toISOString(),
        user: log.user
          ? {
              id: log.user.id,
              email: log.user.email,
              firstName: log.user.firstName,
              lastName: log.user.lastName,
            }
          : null,
      })),
      nextCursor,
    };
  }
}
