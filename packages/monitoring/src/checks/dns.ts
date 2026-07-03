import { Resolver } from "node:dns/promises";
import type { CheckResult } from "../types.js";

export interface DnsResolver {
  resolve4(host: string): Promise<string[]>;
}

const defaultResolver: DnsResolver = new Resolver();

export async function checkDns(host: string, resolver: DnsResolver = defaultResolver): Promise<CheckResult> {
  try {
    const addresses = await resolver.resolve4(host);
    if (!addresses || addresses.length === 0) {
      return { status: "down", detail: { reason: "no-answer" } };
    }
    return { status: "up", detail: { addresses } };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
    // SERVFAIL / REFUSED / ENOTFOUND / ENODATA all mean the name does not usably resolve.
    return { status: "down", detail: { code, message: err instanceof Error ? err.message : String(err) } };
  }
}
