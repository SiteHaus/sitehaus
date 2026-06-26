import type { CheckResult } from "../types.js";

export interface ServiceHealthOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

export async function checkServiceHealth(
  url: string,
  opts: ServiceHealthOptions = {},
): Promise<CheckResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const now = opts.now ?? (() => Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  const start = now();
  try {
    const res = await fetchFn(url, { signal: controller.signal });
    const latencyMs = now() - start;
    if (res.status !== 200)
      return { status: "down", latencyMs, detail: { httpStatus: res.status } };
    const body = (await res.json().catch(() => ({}))) as { status?: string };
    if (body.status && body.status !== "ok") {
      return { status: "degraded", latencyMs, detail: { reported: body.status } };
    }
    return { status: "up", latencyMs, detail: { reported: body.status ?? "ok" } };
  } catch (err) {
    return { status: "down", detail: { error: err instanceof Error ? err.message : String(err) } };
  } finally {
    clearTimeout(timer);
  }
}
