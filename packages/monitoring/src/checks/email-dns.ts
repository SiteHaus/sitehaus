import { Resolver } from "node:dns/promises";
import type { CheckResult } from "../types.js";

export interface EmailDnsResolver {
  resolveMx(domain: string): Promise<{ exchange: string; priority: number }[]>;
  resolveTxt(name: string): Promise<string[][]>;
}

const defaultResolver: EmailDnsResolver = new Resolver();

export interface EmailDnsOptions {
  dkimSelector?: string;
  resolver?: EmailDnsResolver;
}

const flatten = (txt: string[][]) => txt.map((parts) => parts.join("")).map((s) => s.toLowerCase());

export async function checkEmailDns(
  domain: string,
  opts: EmailDnsOptions = {},
): Promise<CheckResult> {
  const resolver = opts.resolver ?? defaultResolver;
  const selector = opts.dkimSelector ?? "google";
  const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => p.catch(() => fallback);

  const [mxRecords, rootTxt, dkimTxt] = await Promise.all([
    safe(resolver.resolveMx(domain), [] as { exchange: string; priority: number }[]),
    safe(resolver.resolveTxt(domain), [] as string[][]),
    safe(resolver.resolveTxt(`${selector}._domainkey.${domain}`), [] as string[][]),
  ]);

  const mx = mxRecords.length > 0;
  const spf = flatten(rootTxt).some((t) => t.startsWith("v=spf1"));
  const dkim = flatten(dkimTxt).some((t) => t.includes("v=dkim1") || t.includes("p="));
  const detail = { mx, spf, dkim, selector };

  if (!mx) return { status: "down", detail };
  if (!spf || !dkim) return { status: "degraded", detail };
  return { status: "up", detail };
}
