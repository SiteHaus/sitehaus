import tls from "node:tls";
import type { CheckResult } from "../types.js";

export type SslProbe = (host: string, port?: number) => Promise<{ validTo: Date; valid: boolean }>;

export interface SslOptions {
  warnDays?: number;
  probe?: SslProbe;
  now?: () => Date;
}

const defaultProbe: SslProbe = (host, port = 443) =>
  new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port, servername: host, timeout: 10_000 }, () => {
      const cert = socket.getPeerCertificate();
      const valid = socket.authorized;
      socket.end();
      if (!cert || !cert.valid_to) return reject(new Error("no-cert"));
      resolve({ validTo: new Date(cert.valid_to), valid });
    });
    socket.on("error", reject);
    socket.on("timeout", () => { socket.destroy(); reject(new Error("tls-timeout")); });
  });

export async function checkSsl(host: string, opts: SslOptions = {}): Promise<CheckResult> {
  const probe = opts.probe ?? defaultProbe;
  const now = (opts.now ?? (() => new Date()))();
  const warnDays = opts.warnDays ?? 14;
  try {
    const { validTo, valid } = await probe(host);
    const daysLeft = Math.floor((validTo.getTime() - now.getTime()) / 86_400_000);
    if (!valid) return { status: "down", detail: { daysLeft, reason: "invalid-cert" } };
    if (daysLeft < 0) return { status: "down", detail: { daysLeft, reason: "expired" } };
    if (daysLeft < warnDays) return { status: "degraded", detail: { daysLeft } };
    return { status: "up", detail: { daysLeft } };
  } catch (err) {
    return { status: "down", detail: { error: err instanceof Error ? err.message : String(err) } };
  }
}
