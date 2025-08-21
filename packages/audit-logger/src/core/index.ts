import { db } from "@site-haus/db/src";
import { auditLogsTable } from "@site-haus/db/core/schema";

export interface AuditLogEntry {
  action: string;
  userId?: string;
  entity?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export async function logAuditEntry(entry: AuditLogEntry) {
  await db.insert(auditLogsTable).values({
    action: entry.action,
    userId: entry.userId!, // make sure userId is passed if required
    entity: entry.entity || "N/A",
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    createdAt: entry.timestamp || new Date(),
  });
}
