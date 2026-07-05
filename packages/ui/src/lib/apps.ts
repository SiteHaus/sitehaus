// Shared SiteHaus app registry for cross-app switchers. One source of truth so a
// new app (or a label tweak) shows up in every switcher at once. Each `id` is the
// app's subdomain — `getAppUrl` swaps the leftmost hostname label, so it works
// across localhost, staging, and prod without per-env config.

export interface SiteHausApp {
  id: string;
  label: string;
  subtitle: string;
  initials: string;
}

export const APPS: readonly SiteHausApp[] = [
  { id: "dashboard", label: "SiteHaus", subtitle: "Client Portal", initials: "SH" },
  { id: "commerce", label: "Commerce", subtitle: "Store Admin", initials: "EC" },
  { id: "status", label: "Status", subtitle: "Lighthaus", initials: "LH" },
  { id: "iam", label: "IAM", subtitle: "Identity & Access", initials: "IA" },
] as const;

/** URL for another app on the same host, swapping only the subdomain label. */
export function getAppUrl(appId: string): string {
  if (typeof window === "undefined") return "#";
  const parts = window.location.hostname.split(".");
  parts[0] = appId;
  return `${window.location.protocol}//${parts.join(".")}`;
}
