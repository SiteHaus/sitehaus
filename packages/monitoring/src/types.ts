export type CheckStatus = "up" | "degraded" | "down";

export interface CheckResult {
  status: CheckStatus;
  latencyMs?: number;
  detail: Record<string, unknown>;
}

export type MonitorType =
  | "http"
  | "dns"
  | "ssl"
  | "domain"
  | "email_dns"
  | "service_health"
  | "heartbeat";
