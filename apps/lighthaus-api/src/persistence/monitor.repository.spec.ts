import { computeUptimePct, filterByViewer } from "./monitor.repository";

describe("computeUptimePct", () => {
  it("100% all up", () => expect(computeUptimePct([{ status: "up" }, { status: "up" }])).toBe(100));
  it("50% half down", () =>
    expect(computeUptimePct([{ status: "up" }, { status: "down" }])).toBe(50));
  it("degraded counts as available", () =>
    expect(computeUptimePct([{ status: "degraded" }])).toBe(100));
  it("100% when empty", () => expect(computeUptimePct([])).toBe(100));
});

describe("filterByViewer", () => {
  const mons = [
    { id: "a", clientId: null },
    { id: "b", clientId: "c1" },
    { id: "c", clientId: "c2" },
  ];
  it("staff see all", () =>
    expect(filterByViewer(mons, { isStaff: true, clientIds: [] }).map((m) => m.id)).toEqual([
      "a",
      "b",
      "c",
    ]));
  it("client sees only own (never null/staff-only)", () =>
    expect(filterByViewer(mons, { isStaff: false, clientIds: ["c1"] }).map((m) => m.id)).toEqual([
      "b",
    ]));
});
