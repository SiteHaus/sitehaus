import { checkSsl } from "./ssl.js";

const now = new Date("2026-06-26T00:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);

describe("checkSsl", () => {
  it("up when valid and far from expiry", async () => {
    const r = await checkSsl("x.test", { now: () => now, probe: async () => ({ validTo: inDays(90), valid: true }) });
    expect(r.status).toBe("up");
    expect(r.detail.daysLeft).toBe(90);
  });

  it("degraded when valid but < warnDays (14) away", async () => {
    const r = await checkSsl("x.test", { warnDays: 14, now: () => now, probe: async () => ({ validTo: inDays(10), valid: true }) });
    expect(r.status).toBe("degraded");
    expect(r.detail.daysLeft).toBe(10);
  });

  it("down when expired", async () => {
    const r = await checkSsl("x.test", { now: () => now, probe: async () => ({ validTo: inDays(-1), valid: true }) });
    expect(r.status).toBe("down");
  });

  it("down when probe reports invalid", async () => {
    const r = await checkSsl("x.test", { now: () => now, probe: async () => ({ validTo: inDays(90), valid: false }) });
    expect(r.status).toBe("down");
  });
});
