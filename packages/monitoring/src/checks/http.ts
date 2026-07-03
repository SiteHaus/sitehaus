import type { CheckResult } from "../types.js";

export interface HttpCheckOptions {
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  now?: () => number;
}

export async function checkHttp(url: string, opts: HttpCheckOptions = {}): Promise<CheckResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const now = opts.now ?? (() => Date.now());
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const start = now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, { signal: controller.signal, redirect: "follow" });
    const latencyMs = now() - start;
    if (res.status >= 200 && res.status < 300) {
      return { status: "up", latencyMs, detail: { httpStatus: res.status } };
    }
    return { status: "down", latencyMs, detail: { httpStatus: res.status } };
  } catch (err) {
    return { status: "down", detail: { error: err instanceof Error ? err.message : String(err) } };
  } finally {
    clearTimeout(timer);
  }
}
