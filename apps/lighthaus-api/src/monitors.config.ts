import type { MonitorType } from "@site-haus/monitoring";

export type MonitorGroup = "client-site" | "sh-service" | "commerce-service";

export interface MonitorCheck {
  type: MonitorType;
  target: string;
  thresholds?: Record<string, number | string>;
}

export interface MonitorConfig {
  name: string;
  group: MonitorGroup;
  clientId?: string; // Revision v2: set for client-site monitors → tenant scoping
  checks: MonitorCheck[];
}

export const monitors: MonitorConfig[] = [
  {
    name: "onehealthclinics.com",
    group: "client-site",
    clientId: process.env.ONEHEALTH_CLIENT_ID, // confirm real client id at deploy (§ spec open items)
    checks: [
      { type: "http", target: "https://onehealthclinics.com" },
      { type: "dns", target: "onehealthclinics.com" },
      { type: "ssl", target: "onehealthclinics.com", thresholds: { sslWarnDays: 14 } },
      { type: "domain", target: "onehealthclinics.com", thresholds: { domainWarnDays: 30 } },
      { type: "email_dns", target: "onehealthclinics.com", thresholds: { dkimSelector: "google" } },
    ],
  },
  {
    name: "sitehaus-api",
    group: "sh-service",
    checks: [{ type: "service_health", target: "https://api.sitehaus.dev/health" }],
  },
  {
    name: "commerce-worker",
    group: "commerce-service",
    checks: [
      { type: "heartbeat", target: "commerce-worker", thresholds: { maxSilenceMs: 180000 } },
    ],
  },
];
