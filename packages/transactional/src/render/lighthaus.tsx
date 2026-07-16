import * as React from "react";
import NotificationEmail from "../emails/NotificationEmail.js";
import { renderHtml, renderText } from "./index.js";

async function render(node: React.ReactElement) {
  const [html, text] = await Promise.all([renderHtml(node), renderText(node)]);
  return { html, text };
}

function formatDowntime(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

// ─── Incident opened (page ops) ──────────────────────────────────────────────

export type IncidentOpenedEmailProps = {
  monitorName: string;
  group: string;
  status: string;
  detail: Record<string, unknown>;
  openedAt: string;
  ctaUrl: string;
};

export async function renderIncidentOpenedEmail(props: IncidentOpenedEmailProps) {
  const subject = `🔴 Incident: ${props.monitorName} is ${props.status}`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title={`${props.monitorName} is ${props.status}`}
      body={`Lighthaus has opened an incident after repeated failed checks. The service has been unreachable long enough to rule out a transient blip.`}
      context={[
        { label: "Monitor", value: props.monitorName },
        { label: "Group", value: props.group },
        { label: "Status", value: props.status },
        { label: "Detected at", value: new Date(props.openedAt).toUTCString() },
        { label: "Detail", value: JSON.stringify(props.detail) },
      ]}
      ctaText="Open status board"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}

// ─── Incident resolved (recovery) ────────────────────────────────────────────

export type IncidentResolvedEmailProps = {
  monitorName: string;
  group: string;
  openedAt: string;
  resolvedAt: string;
  downtimeMs: number;
  ctaUrl: string;
};

export async function renderIncidentResolvedEmail(props: IncidentResolvedEmailProps) {
  const subject = `✅ Resolved: ${props.monitorName} recovered`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title={`${props.monitorName} has recovered`}
      body={`The monitor is passing checks again. Total downtime for this incident was ${formatDowntime(
        props.downtimeMs,
      )}.`}
      context={[
        { label: "Monitor", value: props.monitorName },
        { label: "Group", value: props.group },
        { label: "Downtime", value: formatDowntime(props.downtimeMs) },
        { label: "Opened", value: new Date(props.openedAt).toUTCString() },
        { label: "Resolved", value: new Date(props.resolvedAt).toUTCString() },
      ]}
      ctaText="Open status board"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}

// ─── Daily digest (summary) ──────────────────────────────────────────────────

export type DailyDigestEmailProps = {
  date: string;
  // `type` is the check kind (http/dns/ssl/…). Optional for backward compat
  // with jobs enqueued before it existed — those rows render without a label.
  summary: {
    monitorName: string;
    type?: string;
    group: string;
    uptime24h: number;
    status: string;
  }[];
  openIncidents: { monitorName: string; type?: string; openedAt: string }[];
  ctaUrl: string;
};

const CHECK_LABELS: Record<string, string> = {
  http: "HTTP",
  dns: "DNS",
  ssl: "SSL",
  domain: "Domain",
  email_dns: "Email DNS",
  service_health: "Health",
  heartbeat: "Heartbeat",
};

const checkLabel = (type?: string) =>
  type ? (CHECK_LABELS[type] ?? type.replace(/_/g, " ")) : undefined;

const rowLabel = (name: string, type?: string) => {
  const label = checkLabel(type);
  return label ? `${name} · ${label}` : name;
};

const shortUtc = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }) + " UTC";

export async function renderDailyDigestEmail(props: DailyDigestEmailProps) {
  const openCount = props.openIncidents.length;
  const subject =
    openCount === 0
      ? `Lighthaus daily digest — ${props.date} · all clear`
      : `Lighthaus daily digest — ${props.date} · ${openCount} open`;

  const openSince = new Map(
    props.openIncidents.map((i) => [`${i.monitorName} ${i.type ?? ""}`, i.openedAt]),
  );

  // Problems lead: anything down or short of 100% uptime, worst first.
  const attention = props.summary
    .filter((s) => s.status !== "up" || s.uptime24h < 100)
    .sort((a, b) => a.uptime24h - b.uptime24h);

  // Everything healthy collapses to one line per group — the reader only
  // needs to scan individual rows when something is wrong.
  const healthyByGroup = new Map<string, number>();
  for (const s of props.summary) {
    if (s.status === "up" && s.uptime24h >= 100) {
      healthyByGroup.set(s.group, (healthyByGroup.get(s.group) ?? 0) + 1);
    }
  }

  const attentionRows = attention.map((s) => {
    const since = openSince.get(`${s.monitorName} ${s.type ?? ""}`);
    return {
      label: `⚠ ${rowLabel(s.monitorName, s.type)} (${s.group})`,
      value: `${s.uptime24h}% · ${s.status}${since ? ` — open since ${shortUtc(since)}` : ""}`,
    };
  });

  const healthyRows = [...healthyByGroup.entries()].map(([group, count]) => ({
    label: `✓ ${group}`,
    value: `${count} check${count === 1 ? "" : "s"} · 100%`,
  }));

  const openLine =
    openCount === 0
      ? "No incidents are currently open."
      : `${openCount} incident${openCount === 1 ? "" : "s"} still open.`;

  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title={`Monitoring digest for ${props.date}`}
      body={`The last 24 hours across all monitors. ${openLine}`}
      context={[...attentionRows, ...healthyRows]}
      ctaText="Open status board"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}
