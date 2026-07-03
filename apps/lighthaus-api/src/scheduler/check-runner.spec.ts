import { jest } from "@jest/globals";
import type { CheckResult } from "@site-haus/monitoring";
import { runCheck, type CheckDeps } from "./check-runner";

const up: CheckResult = { status: "up", detail: {} };

function deps(over: Partial<CheckDeps> = {}): CheckDeps {
  return {
    checkHttp: jest.fn(async () => up),
    checkDns: jest.fn(async () => up),
    checkSsl: jest.fn(async () => up),
    checkDomainExpiry: jest.fn(async () => up),
    checkEmailDns: jest.fn(async () => up),
    checkServiceHealth: jest.fn(async () => up),
    evaluateHeartbeat: jest.fn(() => up),
    getLastHeartbeat: jest.fn(async () => new Date()),
    ...over,
  } as unknown as CheckDeps;
}

describe("runCheck", () => {
  it("routes http → checkHttp", async () => {
    const d = deps();
    const r = await runCheck({ type: "http", target: "https://x.test" }, d);
    expect(d.checkHttp).toHaveBeenCalledWith("https://x.test");
    expect(r.status).toBe("up");
  });

  it("routes heartbeat → getLastHeartbeat + evaluateHeartbeat", async () => {
    const d = deps();
    const r = await runCheck(
      { type: "heartbeat", target: "commerce-worker", thresholds: { maxSilenceMs: 180000 } },
      d,
    );
    expect(d.getLastHeartbeat).toHaveBeenCalledWith("commerce-worker");
    expect(d.evaluateHeartbeat).toHaveBeenCalled();
    expect(r.status).toBe("up");
  });

  it("unknown type → down", async () => {
    const r = await runCheck({ type: "wat", target: "x" }, deps());
    expect(r.status).toBe("down");
    expect(r.detail.reason).toBe("unknown-type");
  });
});
