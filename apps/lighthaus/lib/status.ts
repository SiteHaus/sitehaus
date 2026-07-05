// Shared status vocabulary for the board. The lighthaus-api emits three check
// statuses ("up" | "degraded" | "down"); everything the UI colors keys off these.

export type CheckStatus = "up" | "degraded" | "down";

// Dates are ISO strings once they cross the wire (JSON has no Date), so the
// client-side shapes mirror the lighthaus-api output with string timestamps.
export interface StatusMonitorView {
  id: string;
  name: string;
  type: string;
  status: string;
  latencyMs: number | null;
  lastCheckedAt: string | null;
  uptime90d: number;
  openIncidentSince: string | null;
}

// Human labels for the check `type` stored on each monitor. Keeps the board
// readable — five rows for one site are only distinguishable by their check.
const CHECK_TYPE_LABELS: Record<string, string> = {
  http: "HTTP",
  dns: "DNS",
  ssl: "SSL",
  domain: "Domain",
  email_dns: "Email DNS",
  service_health: "Health",
  heartbeat: "Heartbeat",
};

export function checkTypeLabel(type: string): string {
  return CHECK_TYPE_LABELS[type] ?? type.replace(/_/g, " ").toUpperCase();
}

// Plain-language labels for clients (non-technical business owners). Clients only
// ever see client-site checks; the platform types are mapped for completeness.
const CHECK_TYPE_LABELS_FRIENDLY: Record<string, string> = {
  http: "Website",
  dns: "Can be found",
  ssl: "Secure connection",
  domain: "Domain renewal",
  email_dns: "Email setup",
  service_health: "Service",
  heartbeat: "Background worker",
};

export function checkTypeLabelFriendly(type: string): string {
  return CHECK_TYPE_LABELS_FRIENDLY[type] ?? checkTypeLabel(type);
}

// Audience-aware: staff read the technical term they debug with; clients read
// plain language.
export function checkLabel(type: string, isStaff: boolean): string {
  return isStaff ? checkTypeLabel(type) : checkTypeLabelFriendly(type);
}

// Display names for monitor groups. A client only ever sees their own site, so
// "client-site" reads as "Your Website" for them; staff see all four sections.
const GROUP_LABELS: Record<string, string> = {
  "client-site": "Client Sites",
  "sh-service": "SiteHaus Platform",
  "commerce-service": "Commerce",
  staging: "Staging",
};

export function groupLabel(group: string, isStaff: boolean): string {
  if (group === "client-site" && !isStaff) return "Your Website";
  return GROUP_LABELS[group] ?? group.replace(/-/g, " ");
}

export interface StatusBoard {
  isStaff: boolean;
  groups: { group: string; monitors: StatusMonitorView[] }[];
}

export interface Monitor {
  id: string;
  name: string;
  type: string;
  target: string;
  group: string;
  clientId: string | null;
  thresholds: unknown;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CheckResultRow {
  id: string;
  monitorId: string;
  status: string;
  latencyMs: number | null;
  detail: unknown;
  checkedAt: string;
}

export interface Incident {
  id: string;
  monitorId: string;
  openedAt: string;
  resolvedAt: string | null;
  lastStatus: string;
  notifiedOpen: boolean;
  notifiedResolved: boolean;
}

export interface MonitorDetail {
  monitor: Monitor;
  history: CheckResultRow[];
  incidents: Incident[];
}

// Tailwind classes rather than a badge variant: the board is a wall of dots and
// bars where the color IS the signal, so we want direct control over the swatch.
const STATUS_META: Record<CheckStatus, { label: string; dot: string; bar: string; text: string }> =
  {
    up: {
      label: "Operational",
      dot: "bg-emerald-500",
      bar: "bg-emerald-500",
      text: "text-emerald-600",
    },
    degraded: {
      label: "Degraded",
      dot: "bg-amber-500",
      bar: "bg-amber-500",
      text: "text-amber-600",
    },
    down: { label: "Down", dot: "bg-red-500", bar: "bg-red-500", text: "text-red-600" },
  };

const UNKNOWN = {
  label: "Unknown",
  dot: "bg-muted-foreground/40",
  bar: "bg-muted-foreground/30",
  text: "text-muted-foreground",
};

export function statusMeta(status: string) {
  return STATUS_META[status as CheckStatus] ?? UNKNOWN;
}

// Roll a group of monitors up to its worst member so a group header can show
// one dot: any down → down, else any degraded → degraded, else up.
export function worstStatus(monitors: { status: string }[]): CheckStatus {
  if (monitors.some((m) => m.status === "down")) return "down";
  if (monitors.some((m) => m.status === "degraded")) return "degraded";
  return "up";
}
