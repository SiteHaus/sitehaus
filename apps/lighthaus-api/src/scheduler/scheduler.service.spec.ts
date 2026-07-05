import { jest } from "@jest/globals";
import type { DeadmanService } from "../deadman/deadman.service";
import type { DispatcherService } from "../dispatcher/dispatcher.service";
import type { MonitorRepository } from "../persistence/monitor.repository";
import type { SnapshotService } from "../snapshot/snapshot.service";
import { SchedulerService } from "./scheduler.service";

type RepoMock = {
  syncFromConfig: jest.Mock;
  listOpenIncidents: jest.Mock;
  listEnabled: jest.Mock;
  recordResult: jest.Mock;
  getOpenIncident: jest.Mock;
  resolveIncident: jest.Mock;
  openIncident: jest.Mock;
  getLastHeartbeat: jest.Mock;
};

function makeService(overrides: Partial<RepoMock> = {}) {
  const repo: RepoMock = {
    syncFromConfig: jest.fn(async () => undefined),
    listOpenIncidents: jest.fn(async () => []),
    listEnabled: jest.fn(async () => []),
    recordResult: jest.fn(async () => undefined),
    getOpenIncident: jest.fn(async () => null),
    resolveIncident: jest.fn(async () => undefined),
    openIncident: jest.fn(async () => ({ id: "inc-1" })),
    getLastHeartbeat: jest.fn(async () => null),
    ...overrides,
  };
  const dispatcher = { dispatch: jest.fn(async () => undefined) };
  const deadman = { ping: jest.fn(async () => undefined) };
  const snapshot = { publish: jest.fn(async () => undefined) };
  const service = new SchedulerService(
    repo as unknown as MonitorRepository,
    dispatcher as unknown as DispatcherService,
    deadman as unknown as DeadmanService,
    snapshot as unknown as SnapshotService,
  );
  return { service, repo, dispatcher };
}

const monitor = {
  id: "m1",
  name: "api",
  group: "prod",
  type: "http",
  target: "https://api.example.com",
  thresholds: null,
};

describe("SchedulerService incident rehydration", () => {
  it("resolves a dangling open incident when the monitor comes back up after a restart", async () => {
    const openIncident = {
      id: "inc-1",
      monitorId: "m1",
      openedAt: new Date("2026-07-01T00:00:00Z"),
    };
    const { service, repo, dispatcher } = makeService({
      listOpenIncidents: jest.fn(async () => [openIncident]),
      listEnabled: jest.fn(async () => [monitor]),
      getOpenIncident: jest.fn(async () => openIncident),
    });
    // Simulated restart: DB has an open incident, in-memory state starts empty.
    await service.onModuleInit();

    // First post-restart check comes back up → the reducer must see the
    // rehydrated open state and emit a resolve, not silently do nothing.
    (service as unknown as { deps: { checkHttp: unknown } }).deps.checkHttp = jest.fn(async () => ({
      status: "up",
      latencyMs: 10,
      detail: {},
    }));
    await service.fastCycle();

    expect(repo.resolveIncident).toHaveBeenCalledWith("inc-1");
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "lighthaus.incident_resolved", monitorId: "m1" }),
    );
  });

  it("does not reopen a duplicate incident when the monitor is still down after a restart", async () => {
    const openIncident = {
      id: "inc-1",
      monitorId: "m1",
      openedAt: new Date("2026-07-01T00:00:00Z"),
    };
    const { service, repo, dispatcher } = makeService({
      listOpenIncidents: jest.fn(async () => [openIncident]),
      listEnabled: jest.fn(async () => [monitor]),
      getOpenIncident: jest.fn(async () => openIncident),
    });
    await service.onModuleInit();

    (service as unknown as { deps: { checkHttp: unknown } }).deps.checkHttp = jest.fn(async () => ({
      status: "down",
      detail: {},
    }));
    await service.fastCycle();
    await service.fastCycle();

    expect(repo.openIncident).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "lighthaus.incident_opened" }),
    );
  });
});

describe("SchedulerService overlap guard", () => {
  it("skips a tick while the previous fast cycle is still running", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const listEnabled = jest.fn(async () => {
      await gate;
      return [];
    });
    const { service } = makeService({ listEnabled: listEnabled as RepoMock["listEnabled"] });

    const first = service.fastCycle();
    const second = service.fastCycle(); // fires while the first is blocked

    release();
    await Promise.all([first, second]);

    // Only the first tick ran the group — the overlapping one was skipped.
    expect(listEnabled).toHaveBeenCalledTimes(1);
  });
});
