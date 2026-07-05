import type { MonitorType } from "@site-haus/monitoring";

export type MonitorGroup = "client-site" | "sh-service" | "commerce-service" | "staging";

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

// A first-party SiteHaus service: is it serving (health endpoint) + is its cert
// healthy (SSL expiry). DNS is skipped — we run these domains through Cloudflare.
function service(name: string, group: MonitorGroup, healthUrl: string): MonitorConfig {
  return {
    name,
    group,
    checks: [
      { type: "service_health", target: healthUrl },
      { type: "ssl", target: new URL(healthUrl).hostname, thresholds: { sslWarnDays: 14 } },
    ],
  };
}

export const monitors: MonitorConfig[] = [
  // ── Client sites ──────────────────────────────────────────────────────────
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
    name: "nayadnara.com",
    group: "client-site",
    clientId: process.env.NAYADNARA_CLIENT_ID, // set once Nayadnara has an OAuth client → scopes to his view
    checks: [
      { type: "http", target: "https://nayadnara.com" },
      { type: "dns", target: "nayadnara.com" },
      { type: "domain", target: "nayadnara.com", thresholds: { domainWarnDays: 30 } },
      { type: "ssl", target: "nayadnara.com", thresholds: { sslWarnDays: 14 } },
    ],
  },

  // ── SiteHaus platform (prod) ─────────────────────────────────────────────
  service("dashboard.sitehaus.dev", "sh-service", "https://dashboard.sitehaus.dev/api/health"),
  service("iam.sitehaus.dev", "sh-service", "https://iam.sitehaus.dev/api/health"),
  service("api.sitehaus.dev", "sh-service", "https://api.sitehaus.dev/health"),

  // ── Commerce (prod) ──────────────────────────────────────────────────────
  service("commerce.sitehaus.dev", "commerce-service", "https://commerce.sitehaus.dev/api/health"),
  service(
    "api.commerce.sitehaus.dev",
    "commerce-service",
    "https://api.commerce.sitehaus.dev/health",
  ),
  {
    name: "commerce-worker",
    group: "commerce-service",
    checks: [
      { type: "heartbeat", target: "commerce-worker", thresholds: { maxSilenceMs: 180000 } },
    ],
  },

  // ── Staging (staff-only — our services + any client sites with a staging env) ─
  service(
    "dashboard.staging.sitehaus.dev",
    "staging",
    "https://dashboard.staging.sitehaus.dev/api/health",
  ),
  service("iam.staging.sitehaus.dev", "staging", "https://iam.staging.sitehaus.dev/api/health"),
  service("api.staging.sitehaus.dev", "staging", "https://api.staging.sitehaus.dev/health"),
  service(
    "commerce.staging.sitehaus.dev",
    "staging",
    "https://commerce.staging.sitehaus.dev/api/health",
  ),
  service(
    "api.commerce.staging.sitehaus.dev",
    "staging",
    "https://api.commerce.staging.sitehaus.dev/health",
  ),
  // Client staging site — a website, not a service. domain/email_dns live on the
  // prod root (onehealthclinics.com), so staging only checks reachability + cert.
  {
    name: "staging.onehealthclinics.com",
    group: "staging",
    checks: [
      { type: "http", target: "https://staging.onehealthclinics.com" },
      { type: "dns", target: "staging.onehealthclinics.com" },
      { type: "ssl", target: "staging.onehealthclinics.com", thresholds: { sslWarnDays: 14 } },
    ],
  },
];
