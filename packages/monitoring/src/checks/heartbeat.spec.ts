import { evaluateHeartbeat } from "./heartbeat.js";

const now = new Date("2026-06-26T00:00:00Z");

describe("evaluateHeartbeat", () => {
  it("up when last seen within window", () => {
    const r = evaluateHeartbeat(new Date(now.getTime() - 60_000), now, 180_000);
    expect(r.status).toBe("up");
  });

  it("down when silence exceeds window", () => {
    const r = evaluateHeartbeat(new Date(now.getTime() - 600_000), now, 180_000);
    expect(r.status).toBe("down");
  });

  it("down when never seen", () => {
    const r = evaluateHeartbeat(null, now, 180_000);
    expect(r.status).toBe("down");
    expect(r.detail.reason).toBe("never-seen");
  });
});
