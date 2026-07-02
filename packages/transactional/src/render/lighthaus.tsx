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
  summary: { monitorName: string; group: string; uptime24h: number; status: string }[];
  openIncidents: { monitorName: string; openedAt: string }[];
  ctaUrl: string;
};

export async function renderDailyDigestEmail(props: DailyDigestEmailProps) {
  const subject = `Lighthaus daily digest — ${props.date}`;
  const openLine =
    props.openIncidents.length === 0
      ? "No incidents are currently open."
      : `${props.openIncidents.length} incident(s) still open.`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title={`Monitoring digest for ${props.date}`}
      body={`Here is the last 24 hours of availability across all monitors. ${openLine}`}
      context={[
        ...props.summary.map((s) => ({
          label: `${s.monitorName} (${s.group})`,
          value: `${s.uptime24h}% · ${s.status}`,
        })),
        ...props.openIncidents.map((i) => ({
          label: `Open: ${i.monitorName}`,
          value: `since ${new Date(i.openedAt).toUTCString()}`,
        })),
      ]}
      ctaText="Open status board"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}
