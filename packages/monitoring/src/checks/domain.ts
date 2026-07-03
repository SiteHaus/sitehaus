import type { CheckResult } from "../types.js";

export type RdapFetch = (domain: string) => Promise<{ expiration: Date | null }>;

export interface DomainOptions {
  warnDays?: number;
  fetchRdap?: RdapFetch;
  now?: () => Date;
}

const defaultFetchRdap: RdapFetch = async (domain) => {
  const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
    headers: { accept: "application/rdap+json" },
  });
  if (!res.ok) return { expiration: null };
  const body = (await res.json()) as { events?: { eventAction: string; eventDate: string }[] };
  const event = body.events?.find((e) => e.eventAction === "expiration");
  return { expiration: event ? new Date(event.eventDate) : null };
};

export async function checkDomainExpiry(domain: string, opts: DomainOptions = {}): Promise<CheckResult> {
  const fetchRdap = opts.fetchRdap ?? defaultFetchRdap;
  const now = (opts.now ?? (() => new Date()))();
  const warnDays = opts.warnDays ?? 30;
  try {
    const { expiration } = await fetchRdap(domain);
    if (!expiration) return { status: "degraded", detail: { reason: "no-expiration-data" } };
    const daysLeft = Math.floor((expiration.getTime() - now.getTime()) / 86_400_000);
    if (daysLeft < 0) return { status: "down", detail: { daysLeft, reason: "expired" } };
    if (daysLeft < warnDays) return { status: "degraded", detail: { daysLeft } };
    return { status: "up", detail: { daysLeft } };
  } catch (err) {
    return { status: "degraded", detail: { reason: "rdap-error", error: err instanceof Error ? err.message : String(err) } };
  }
}
