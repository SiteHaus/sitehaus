import { buildSnapshot, type LastResult, type SnapshotMonitor } from "./snapshot.service";

const now = new Date("2026-06-26T00:00:00Z");

const monitors: SnapshotMonitor[] = [
  { id: "a", name: "onehealthclinics.com", type: "http", group: "client-site" },
  { id: "b", name: "onehealthclinics.com", type: "ssl", group: "client-site" },
  { id: "c", name: "sitehaus-api", type: "service_health", group: "sh-service" },
];

const lastResults: Record<string, LastResult> = {
  a: { status: "up", lastCheckedAt: "2026-06-25T23:59:00Z", uptime24h: 100 },
  b: { status: "degraded", lastCheckedAt: "2026-06-25T23:00:00Z", uptime24h: 100 },
  c: { status: "down", lastCheckedAt: "2026-06-25T23:58:00Z", uptime24h: 80 },
};

describe("buildSnapshot", () => {
  it("groups monitors by group and maps each to its status view", () => {
    const snap = buildSnapshot(monitors, lastResults, [], now);
    expect(snap.generatedAt).toBe("2026-06-26T00:00:00.000Z");
    expect(snap.groups.map((g) => g.group)).toEqual(["client-site", "sh-service"]);

    const clientSite = snap.groups.find((g) => g.group === "client-site")!;
    expect(clientSite.monitors).toHaveLength(2);
    expect(clientSite.monitors[1]).toEqual({
      name: "onehealthclinics.com",
      type: "ssl",
      status: "degraded",
      lastCheckedAt: "2026-06-25T23:00:00Z",
      uptime24h: 100,
    });
  });

  it("defaults missing monitors to up/100 and passes through open incidents", () => {
    const snap = buildSnapshot(
      [{ id: "x", name: "new.test", type: "http", group: "client-site" }],
      {},
      [{ monitorName: "sitehaus-api", openedAt: "2026-06-25T20:00:00Z" }],
      now,
    );
    expect(snap.groups[0].monitors[0]).toMatchObject({ status: "up", uptime24h: 100 });
    expect(snap.openIncidents).toEqual([
      { monitorName: "sitehaus-api", openedAt: "2026-06-25T20:00:00Z" },
    ]);
  });
});
