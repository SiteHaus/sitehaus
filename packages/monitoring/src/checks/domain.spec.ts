import { checkDomainExpiry } from "./domain.js";

const now = new Date("2026-06-26T00:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);

describe("checkDomainExpiry", () => {
  it("up when expiry far away", async () => {
    const r = await checkDomainExpiry("x.test", { now: () => now, fetchRdap: async () => ({ expiration: inDays(200) }) });
    expect(r.status).toBe("up");
  });

  it("degraded when < warnDays (30)", async () => {
    const r = await checkDomainExpiry("x.test", { warnDays: 30, now: () => now, fetchRdap: async () => ({ expiration: inDays(20) }) });
    expect(r.status).toBe("degraded");
    expect(r.detail.daysLeft).toBe(20);
  });

  it("down when already expired", async () => {
    const r = await checkDomainExpiry("x.test", { now: () => now, fetchRdap: async () => ({ expiration: inDays(-2) }) });
    expect(r.status).toBe("down");
  });

  it("degraded when RDAP has no expiration data", async () => {
    const r = await checkDomainExpiry("x.test", { now: () => now, fetchRdap: async () => ({ expiration: null }) });
    expect(r.status).toBe("degraded");
    expect(r.detail.reason).toBe("no-expiration-data");
  });
});
