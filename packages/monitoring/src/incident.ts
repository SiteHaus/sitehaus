import type { CheckResult } from "./types.js";

export interface IncidentState {
  consecutiveFailures: number;
  open: boolean;
}

export type Transition = { kind: "none" } | { kind: "open" } | { kind: "resolve" };

export interface ReduceOptions {
  failureThreshold?: number;
}

export function reduceIncident(
  state: IncidentState,
  result: CheckResult,
  opts: ReduceOptions = {},
): { state: IncidentState; transition: Transition } {
  const threshold = opts.failureThreshold ?? 2;
  const isFailure = result.status === "down"; // degraded never opens an incident

  if (isFailure) {
    const consecutiveFailures = state.consecutiveFailures + 1;
    const shouldOpen = !state.open && consecutiveFailures >= threshold;
    return {
      state: { consecutiveFailures, open: state.open || shouldOpen },
      transition: shouldOpen ? { kind: "open" } : { kind: "none" },
    };
  }

  // success (up or degraded)
  if (state.open && result.status === "up") {
    return { state: { consecutiveFailures: 0, open: false }, transition: { kind: "resolve" } };
  }
  // degraded is not a failure: keep the incident's open state as-is, but reset the consecutive-failure counter to 0
  if (result.status === "degraded") {
    return { state: { ...state, consecutiveFailures: 0 }, transition: { kind: "none" } };
  }
  return { state: { consecutiveFailures: 0, open: state.open }, transition: { kind: "none" } };
}
