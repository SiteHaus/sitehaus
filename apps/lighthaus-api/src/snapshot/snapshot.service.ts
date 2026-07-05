import { Inject, Injectable, Logger } from "@nestjs/common";
import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { MonitorRepository } from "../persistence/monitor.repository";
import { R2_CLIENT } from "./tokens";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SnapshotMonitor {
  id: string;
  name: string;
  type: string;
  group: string;
}

export interface LastResult {
  status: string;
  lastCheckedAt: string | null;
  uptime24h: number;
}

export interface StatusSnapshot {
  generatedAt: string;
  groups: {
    group: string;
    monitors: {
      name: string;
      type: string;
      status: string;
      lastCheckedAt: string | null;
      uptime24h: number;
    }[];
  }[];
  openIncidents: { monitorName: string; openedAt: string }[];
}

/**
 * Pure builder for the failure-domain-independent status snapshot. Deliberately
 * excludes per-client detail — it's the staff war-room view served behind
 * Cloudflare Access, independent of the SiteHaus IAM / dashboard being up.
 */
export function buildSnapshot(
  monitors: SnapshotMonitor[],
  lastResults: Record<string, LastResult>,
  openIncidents: { monitorName: string; openedAt: string }[],
  now: Date,
): StatusSnapshot {
  const byGroup = new Map<string, StatusSnapshot["groups"][number]["monitors"]>();
  for (const m of monitors) {
    const last = lastResults[m.id];
    const entry = {
      name: m.name,
      type: m.type,
      status: last?.status ?? "up",
      lastCheckedAt: last?.lastCheckedAt ?? null,
      uptime24h: last?.uptime24h ?? 100,
    };
    const list = byGroup.get(m.group) ?? [];
    list.push(entry);
    byGroup.set(m.group, list);
  }
  return {
    generatedAt: now.toISOString(),
    groups: [...byGroup.entries()].map(([group, mons]) => ({ group, monitors: mons })),
    openIncidents,
  };
}

@Injectable()
export class SnapshotService {
  private readonly logger = new Logger(SnapshotService.name);

  constructor(
    private readonly repo: MonitorRepository,
    private readonly config: ConfigService,
    @Inject(R2_CLIENT) private readonly s3: S3Client,
  ) {}

  async publish(): Promise<void> {
    const monitors = (await this.repo.listEnabled()) as SnapshotMonitor[];
    const lastResults: Record<string, LastResult> = {};
    const openIncidents: { monitorName: string; openedAt: string }[] = [];

    for (const m of monitors) {
      const last = await this.repo.getLastResult(m.id);
      const uptime24h = await this.repo.uptime(m.id, DAY_MS);
      lastResults[m.id] = {
        status: last?.status ?? "up",
        lastCheckedAt: last?.checkedAt.toISOString() ?? null,
        uptime24h,
      };
      const open = await this.repo.getOpenIncident(m.id);
      if (open) openIncidents.push({ monitorName: m.name, openedAt: open.openedAt.toISOString() });
    }

    const snapshot = buildSnapshot(monitors, lastResults, openIncidents, new Date());
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.config.get<string>("lighthaus.r2.bucket"),
        Key: "status.json",
        Body: JSON.stringify(snapshot),
        ContentType: "application/json",
        CacheControl: "public, max-age=30",
      }),
    );
  }
}
