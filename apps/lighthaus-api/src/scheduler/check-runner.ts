import {
  checkDns,
  checkDomainExpiry,
  checkEmailDns,
  checkHttp,
  checkServiceHealth,
  checkSsl,
  evaluateHeartbeat,
  type CheckResult,
} from "@site-haus/monitoring";

export interface MonitorLike {
  type: string;
  target: string;
  thresholds?: Record<string, unknown> | null;
}

export interface CheckDeps {
  checkHttp: typeof checkHttp;
  checkDns: typeof checkDns;
  checkSsl: typeof checkSsl;
  checkDomainExpiry: typeof checkDomainExpiry;
  checkEmailDns: typeof checkEmailDns;
  checkServiceHealth: typeof checkServiceHealth;
  evaluateHeartbeat: typeof evaluateHeartbeat;
  getLastHeartbeat: (target: string) => Promise<Date | null>;
}

/** The framework-free check fns bundled for production use. */
export const realChecks = {
  checkHttp,
  checkDns,
  checkSsl,
  checkDomainExpiry,
  checkEmailDns,
  checkServiceHealth,
  evaluateHeartbeat,
};

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Pure dispatch: route a monitor to its check fn. Unknown type → down. */
export async function runCheck(monitor: MonitorLike, deps: CheckDeps): Promise<CheckResult> {
  const t = monitor.target;
  const th = (monitor.thresholds ?? {}) as Record<string, unknown>;
  switch (monitor.type) {
    case "http":
      return deps.checkHttp(t);
    case "dns":
      return deps.checkDns(t);
    case "ssl":
      return deps.checkSsl(t, { warnDays: num(th.sslWarnDays) });
    case "domain":
      return deps.checkDomainExpiry(t, { warnDays: num(th.domainWarnDays) });
    case "email_dns":
      return deps.checkEmailDns(t, {
        dkimSelector: typeof th.dkimSelector === "string" ? th.dkimSelector : undefined,
      });
    case "service_health":
      return deps.checkServiceHealth(t);
    case "heartbeat": {
      const last = await deps.getLastHeartbeat(t);
      return deps.evaluateHeartbeat(last, new Date(), num(th.maxSilenceMs) ?? 180_000);
    }
    default:
      return { status: "down", detail: { reason: "unknown-type", type: monitor.type } };
  }
}
