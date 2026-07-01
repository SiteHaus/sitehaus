import { Injectable } from "@nestjs/common";
import { MonitorRepository } from "../persistence/monitor.repository";
import type { LighthausUser } from "../auth/current-user.decorator";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StatusMonitorView {
  id: string;
  name: string;
  type: string;
  status: string;
  lastCheckedAt: Date | null;
  uptime90d: number;
  openIncidentSince: Date | null;
}

export interface StatusBoard {
  isStaff: boolean;
  groups: { group: string; monitors: StatusMonitorView[] }[];
}

@Injectable()
export class StatusService {
  constructor(private readonly repo: MonitorRepository) {}

  private async viewerFor(user: Pick<LighthausUser, "userId" | "isStaff">) {
    const clientIds = user.isStaff ? [] : await this.repo.clientIdsForUser(user.userId);
    return { isStaff: user.isStaff, clientIds };
  }

  async boardFor(user: Pick<LighthausUser, "userId" | "isStaff">): Promise<StatusBoard> {
    const viewer = await this.viewerFor(user);
    const monitors = await this.repo.listForViewer(viewer);

    const groups = new Map<string, StatusMonitorView[]>();
    for (const m of monitors) {
      const last = await this.repo.getLastResult(m.id);
      const uptime90d = await this.repo.uptime(m.id, 90 * DAY_MS);
      const open = await this.repo.getOpenIncident(m.id);
      const view: StatusMonitorView = {
        id: m.id,
        name: m.name,
        type: m.type,
        status: last?.status ?? "up",
        lastCheckedAt: last?.checkedAt ?? null,
        uptime90d,
        openIncidentSince: open?.openedAt ?? null,
      };
      const list = groups.get(m.group) ?? [];
      list.push(view);
      groups.set(m.group, list);
    }

    return {
      isStaff: user.isStaff,
      groups: [...groups.entries()].map(([group, mons]) => ({ group, monitors: mons })),
    };
  }

  /** Returns null when the monitor is outside the viewer's scope → controller 403s. */
  async monitorDetailFor(user: Pick<LighthausUser, "userId" | "isStaff">, monitorId: string) {
    const viewer = await this.viewerFor(user);
    const monitors = await this.repo.listForViewer(viewer);
    const monitor = monitors.find((m) => m.id === monitorId);
    if (!monitor) return null;

    const [history, incidents] = await Promise.all([
      this.repo.recentResults(monitorId, 100),
      this.repo.recentIncidents(monitorId, 20),
    ]);
    return { monitor, history, incidents };
  }
}
