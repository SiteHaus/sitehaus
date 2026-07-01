import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gt, gte, isNull, schema, type Db } from "@site-haus/db";
import type { CheckResult } from "@site-haus/monitoring";
import { LIGHTHAUS_DB } from "../db/tokens";
import type { MonitorConfig } from "../monitors.config";

type Monitor = typeof schema.monitorsTable.$inferSelect;
type Incident = typeof schema.incidentsTable.$inferSelect;

export function computeUptimePct(rows: { status: string }[]): number {
  if (rows.length === 0) return 100;
  return Math.round((rows.filter((r) => r.status !== "down").length / rows.length) * 100);
}

export function filterByViewer<T extends { clientId: string | null }>(
  mons: T[],
  viewer: { isStaff: boolean; clientIds: string[] },
): T[] {
  if (viewer.isStaff) return mons;
  return mons.filter((m) => m.clientId !== null && viewer.clientIds.includes(m.clientId));
}

@Injectable()
export class MonitorRepository {
  constructor(@Inject(LIGHTHAUS_DB) private readonly db: Db) {}

  async syncFromConfig(configs: MonitorConfig[]): Promise<void> {
    for (const cfg of configs) {
      for (const check of cfg.checks) {
        const existing = await this.db.query.monitorsTable.findFirst({
          where: and(
            eq(schema.monitorsTable.name, cfg.name),
            eq(schema.monitorsTable.type, check.type),
            eq(schema.monitorsTable.target, check.target),
          ),
        });
        const values = {
          group: cfg.group,
          clientId: cfg.clientId ?? null,
          thresholds: check.thresholds ?? null,
        };
        if (existing) {
          await this.db
            .update(schema.monitorsTable)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(schema.monitorsTable.id, existing.id));
        } else {
          await this.db
            .insert(schema.monitorsTable)
            .values({ name: cfg.name, type: check.type, target: check.target, ...values });
        }
      }
    }
  }

  listEnabled(): Promise<Monitor[]> {
    return this.db.query.monitorsTable.findMany({ where: eq(schema.monitorsTable.enabled, true) });
  }

  async recordResult(monitorId: string, result: CheckResult): Promise<void> {
    await this.db.insert(schema.checkResultsTable).values({
      monitorId,
      status: result.status,
      latencyMs: result.latencyMs ?? null,
      detail: result.detail,
    });
  }

  async recordHeartbeat(target: string): Promise<void> {
    const m = await this.db.query.monitorsTable.findFirst({
      where: and(
        eq(schema.monitorsTable.type, "heartbeat"),
        eq(schema.monitorsTable.target, target),
      ),
    });
    if (m) await this.recordResult(m.id, { status: "up", detail: { source: "heartbeat-ingest" } });
  }

  async getLastHeartbeat(target: string): Promise<Date | null> {
    const m = await this.db.query.monitorsTable.findFirst({
      where: and(
        eq(schema.monitorsTable.type, "heartbeat"),
        eq(schema.monitorsTable.target, target),
      ),
    });
    if (!m) return null;
    const last = await this.db.query.checkResultsTable.findFirst({
      where: and(
        eq(schema.checkResultsTable.monitorId, m.id),
        eq(schema.checkResultsTable.status, "up"),
      ),
      orderBy: desc(schema.checkResultsTable.checkedAt),
    });
    return last?.checkedAt ?? null;
  }

  async getLastResult(monitorId: string): Promise<{ status: string; checkedAt: Date } | null> {
    const row = await this.db.query.checkResultsTable.findFirst({
      where: eq(schema.checkResultsTable.monitorId, monitorId),
      orderBy: desc(schema.checkResultsTable.checkedAt),
      columns: { status: true, checkedAt: true },
    });
    return row ?? null;
  }

  async getOpenIncident(monitorId: string): Promise<Incident | null> {
    return (
      (await this.db.query.incidentsTable.findFirst({
        where: and(
          eq(schema.incidentsTable.monitorId, monitorId),
          isNull(schema.incidentsTable.resolvedAt),
        ),
      })) ?? null
    );
  }

  async openIncident(monitorId: string, lastStatus: string): Promise<Incident> {
    const [row] = await this.db
      .insert(schema.incidentsTable)
      .values({ monitorId, lastStatus, notifiedOpen: true })
      .returning();
    return row;
  }

  async resolveIncident(id: string): Promise<void> {
    await this.db
      .update(schema.incidentsTable)
      .set({ resolvedAt: new Date(), notifiedResolved: true, lastStatus: "up" })
      .where(eq(schema.incidentsTable.id, id));
  }

  async uptime(monitorId: string, sinceMs: number): Promise<number> {
    const since = new Date(Date.now() - sinceMs);
    const rows = await this.db.query.checkResultsTable.findMany({
      where: and(
        eq(schema.checkResultsTable.monitorId, monitorId),
        gte(schema.checkResultsTable.checkedAt, since),
      ),
      columns: { status: true },
    });
    return computeUptimePct(rows);
  }

  // ── Revision v2 scoped reads (consumed by the read API, Task 16) ──
  async clientIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.db.query.userRolesTable.findMany({
      where: eq(schema.userRolesTable.userId, userId),
      columns: { clientId: true },
    });
    return [...new Set(rows.map((r) => r.clientId).filter((c): c is string => !!c))];
  }

  async listForViewer(viewer: { isStaff: boolean; clientIds: string[] }): Promise<Monitor[]> {
    const all = await this.listEnabled();
    return filterByViewer(all, viewer);
  }

  /** Staff = holds the `admin` role on any first-party (SiteHaus) client. */
  async isStaffAdmin(userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: schema.userRolesTable.id })
      .from(schema.userRolesTable)
      .innerJoin(schema.rolesTable, eq(schema.rolesTable.id, schema.userRolesTable.roleId))
      .innerJoin(schema.clientsTable, eq(schema.clientsTable.id, schema.rolesTable.clientId))
      .where(
        and(
          eq(schema.userRolesTable.userId, userId),
          eq(schema.rolesTable.key, "admin"),
          eq(schema.clientsTable.firstParty, true),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /** Mirror apps/api AccessGuard: session must exist, match aud, be unrevoked and unexpired. */
  async sessionValid(sessionId: string, clientId: string): Promise<boolean> {
    const session = await this.db.query.sessionsTable.findFirst({
      where: and(
        eq(schema.sessionsTable.id, sessionId),
        eq(schema.sessionsTable.clientId, clientId),
        isNull(schema.sessionsTable.revokedAt),
        gt(schema.sessionsTable.expiresAt, new Date()),
      ),
    });
    return !!session;
  }

  recentResults(monitorId: string, limit = 100) {
    return this.db.query.checkResultsTable.findMany({
      where: eq(schema.checkResultsTable.monitorId, monitorId),
      orderBy: desc(schema.checkResultsTable.checkedAt),
      limit,
    });
  }

  recentIncidents(monitorId: string, limit = 20): Promise<Incident[]> {
    return this.db.query.incidentsTable.findMany({
      where: eq(schema.incidentsTable.monitorId, monitorId),
      orderBy: desc(schema.incidentsTable.openedAt),
      limit,
    });
  }
}
