import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { Cron, Interval } from "@nestjs/schedule";
import { reduceIncident, type CheckResult, type IncidentState } from "@site-haus/monitoring";
import { DeadmanService } from "../deadman/deadman.service";
import { DispatcherService } from "../dispatcher/dispatcher.service";
import { monitors as monitorConfigs } from "../monitors.config";
import { MonitorRepository } from "../persistence/monitor.repository";
import { SnapshotService } from "../snapshot/snapshot.service";
import { realChecks, runCheck, type CheckDeps, type MonitorLike } from "./check-runner";

type Monitor = MonitorLike & { id: string; name: string; group: string };

const FAST_TYPES = new Set(["http", "dns", "service_health", "heartbeat"]);
const SLOW_TYPES = new Set(["ssl", "domain", "email_dns"]);
const DAY_MS = 24 * 60 * 60 * 1000;
// Must match reduceIncident's default failureThreshold — rehydrated open
// incidents are seeded at the threshold so the reducer treats them as open.
const FAILURE_THRESHOLD = 2;

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly incidentStates = new Map<string, IncidentState>();
  private readonly deps: CheckDeps;
  private fastCycleRunning = false;

  constructor(
    private readonly repo: MonitorRepository,
    private readonly dispatcher: DispatcherService,
    private readonly deadman: DeadmanService,
    private readonly snapshot: SnapshotService,
  ) {
    this.deps = { ...realChecks, getLastHeartbeat: (t) => this.repo.getLastHeartbeat(t) };
  }

  async onModuleInit(): Promise<void> {
    await this.repo.syncFromConfig(monitorConfigs);
    // Rehydrate incident state from the DB. Without this, a restart forgets
    // every open incident: a still-down monitor would open a duplicate row
    // (and re-alert), and a monitor that recovered while we were down would
    // never emit its resolve transition — the incident stays open forever.
    for (const incident of await this.repo.listOpenIncidents()) {
      this.incidentStates.set(incident.monitorId, {
        consecutiveFailures: FAILURE_THRESHOLD,
        open: true,
      });
    }
  }

  @Interval(120_000)
  async fastCycle(): Promise<void> {
    // A cycle slower than the interval (many monitors × slow timeouts) must
    // not overlap the next one — overlapping runs double-record results and
    // race the in-memory incident state.
    if (this.fastCycleRunning) {
      this.logger.warn("fast cycle still running; skipping this tick");
      return;
    }
    this.fastCycleRunning = true;
    try {
      await this.runFastCycle();
    } finally {
      this.fastCycleRunning = false;
    }
  }

  private async runFastCycle(): Promise<void> {
    await this.runGroup((type) => FAST_TYPES.has(type));
    await this.deadman.ping();
    try {
      await this.snapshot.publish();
    } catch (err) {
      this.logger.warn(
        `snapshot publish failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  @Cron("0 6 * * *")
  async slowCycle(): Promise<void> {
    await this.runGroup((type) => SLOW_TYPES.has(type));
  }

  @Cron("0 8 * * *")
  async dailyDigest(): Promise<void> {
    const all = (await this.repo.listEnabled()) as Monitor[];
    const summary: {
      monitorName: string;
      type: string;
      group: string;
      uptime24h: number;
      status: string;
    }[] = [];
    const openIncidents: { monitorName: string; type: string; openedAt: string }[] = [];

    for (const m of all) {
      const uptime24h = await this.repo.uptime(m.id, DAY_MS);
      const open = await this.repo.getOpenIncident(m.id);
      // `type` disambiguates rows: one site is many monitors (http/dns/ssl/…)
      // that all share the same name — without it the digest reads as
      // duplicate lines with contradictory statuses.
      summary.push({
        monitorName: m.name,
        type: m.type,
        group: m.group,
        uptime24h,
        status: open ? "down" : "up",
      });
      if (open)
        openIncidents.push({
          monitorName: m.name,
          type: m.type,
          openedAt: open.openedAt.toISOString(),
        });
    }

    await this.dispatcher.dispatch({
      type: "lighthaus.daily_digest",
      date: new Date().toISOString().slice(0, 10),
      summary,
      openIncidents,
    });
  }

  private async runGroup(predicate: (type: string) => boolean): Promise<void> {
    const monitors = ((await this.repo.listEnabled()) as Monitor[]).filter((m) =>
      predicate(m.type),
    );
    for (const m of monitors) {
      try {
        const result = await runCheck(m, this.deps);
        await this.repo.recordResult(m.id, result);
        await this.evaluateIncident(m, result);
      } catch (err) {
        this.logger.error(
          `check failed for ${m.name} (${m.type})`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }
  }

  private async evaluateIncident(monitor: Monitor, result: CheckResult): Promise<void> {
    const prev = this.incidentStates.get(monitor.id) ?? { consecutiveFailures: 0, open: false };
    const { state, transition } = reduceIncident(prev, result);
    this.incidentStates.set(monitor.id, state);

    if (transition.kind === "open") {
      await this.repo.openIncident(monitor.id, result.status);
      await this.dispatcher.dispatch({
        type: "lighthaus.incident_opened",
        monitorId: monitor.id,
        monitorName: monitor.name,
        group: monitor.group,
        status: result.status,
        detail: result.detail,
        openedAt: new Date().toISOString(),
      });
    } else if (transition.kind === "resolve") {
      const open = await this.repo.getOpenIncident(monitor.id);
      if (open) {
        await this.repo.resolveIncident(open.id);
        const resolvedAt = new Date();
        await this.dispatcher.dispatch({
          type: "lighthaus.incident_resolved",
          monitorId: monitor.id,
          monitorName: monitor.name,
          group: monitor.group,
          openedAt: open.openedAt.toISOString(),
          resolvedAt: resolvedAt.toISOString(),
          downtimeMs: resolvedAt.getTime() - open.openedAt.getTime(),
        });
      }
    }
  }
}
