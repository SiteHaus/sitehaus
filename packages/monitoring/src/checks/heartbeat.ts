import type { CheckResult } from "../types.js";

export function evaluateHeartbeat(
  lastSeenAt: Date | null,
  now: Date,
  maxSilenceMs: number,
): CheckResult {
  if (!lastSeenAt) return { status: "down", detail: { reason: "never-seen" } };
  const ageMs = now.getTime() - lastSeenAt.getTime();
  if (ageMs > maxSilenceMs) return { status: "down", detail: { ageMs, reason: "stale" } };
  return { status: "up", detail: { ageMs } };
}
