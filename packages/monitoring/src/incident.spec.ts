import { reduceIncident, type IncidentState } from "./incident.js";
import type { CheckResult } from "./types.js";

const clean: IncidentState = { consecutiveFailures: 0, open: false };
const down: CheckResult = { status: "down", detail: {} };
const up: CheckResult = { status: "up", detail: {} };
const degraded: CheckResult = { status: "degraded", detail: {} };

describe("reduceIncident", () => {
  it("a single failure (blip) does not open", () => {
    const { state, transition } = reduceIncident(clean, down);
    expect(transition.kind).toBe("none");
    expect(state).toEqual({ consecutiveFailures: 1, open: false });
  });

  it("two consecutive failures open + alert", () => {
    const first = reduceIncident(clean, down).state;
    const { state, transition } = reduceIncident(first, down);
    expect(transition.kind).toBe("open");
    expect(state.open).toBe(true);
  });

  it("does not re-open while already open", () => {
    const open: IncidentState = { consecutiveFailures: 2, open: true };
    const { transition } = reduceIncident(open, down);
    expect(transition.kind).toBe("none");
  });

  it("recovery while open resolves + alert and resets", () => {
    const open: IncidentState = { consecutiveFailures: 2, open: true };
    const { state, transition } = reduceIncident(open, up);
    expect(transition.kind).toBe("resolve");
    expect(state).toEqual({ consecutiveFailures: 0, open: false });
  });

  it("degraded does not count as a failure", () => {
    const { state, transition } = reduceIncident(clean, degraded);
    expect(transition.kind).toBe("none");
    expect(state.consecutiveFailures).toBe(0);
  });
});
