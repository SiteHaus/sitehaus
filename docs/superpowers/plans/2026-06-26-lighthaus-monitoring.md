# Lighthaus Monitoring & Status System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standalone Lighthaus monitor that watches DNS, SSL, domain-registration, Google-Workspace email DNS, HTTP uptime, and every hosted service's health, opens/resolves incidents, alerts ops via the existing notifications queue (with a Resend failsafe), and surfaces a `/status` board in the dashboard.

**Architecture:** A pure, framework-free check + incident-state-machine library (`@site-haus/monitoring`) drives a thin NestJS app (`apps/lighthaus`) that runs scheduled checks, persists results to Drizzle tables in `@site-haus/db`, and enqueues `lighthaus.*` jobs onto the existing `notifications` BullMQ queue consumed by `apps/api`. The dashboard `/status` route reads the shared Postgres directly — no cross-service API.

**Tech Stack:** TypeScript (ESM), NestJS 11, BullMQ 5, Drizzle ORM + Postgres, Resend, React Email, Next.js 15 App Router + TanStack Query, Jest (ts-jest ESM), Docker Compose.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-26-lighthaus-monitoring-design.md`.
- `@site-haus/monitoring` core has **zero** framework/runtime imports — no NestJS, Next, Docker, BullMQ, or `@site-haus/db`. Only Node stdlib (`dns/promises`, `tls`, `node:https`) and `fetch`. All I/O is injected for tests.
- All packages are ESM (`"type": "module"`); relative imports use explicit `.js` extensions. Drizzle generates migrations from compiled `./dist/**` JS — **build `@site-haus/db` before `pnpm db:gen`**.
- DB columns are snake_case (Drizzle `casing: "snake_case"` — define camelCase keys, omit explicit column names where the helper allows, matching `audit-logs.ts`).
- `CheckResult` shape is fixed: `{ status: 'up'|'degraded'|'down'; latencyMs?: number; detail: Record<string, unknown> }`.
- Incident rule: only `status === 'down'` counts toward opening an incident; `degraded` never pages (surfaced in digest). Default `failureThreshold = 2`.
- Notification job types are branded `lighthaus.incident_opened` / `lighthaus.incident_resolved` / `lighthaus.daily_digest`; they reuse `NOTIFICATIONS_QUEUE = 'notifications'` and the existing `enqueue` job shape.
- Alert emails go to **ops recipients only** (`OPS_RECIPIENTS` env, comma-separated) — never client users.
- Lighthaus lives in the **`sitehaus`** compose stack (`sitehaus-network`): same Postgres as `@site-haus/db`, same Redis as the api notifications queue.
- Commit convention: short, imperative, gitmoji-prefixed (matching repo history). **No `Co-Authored-By` trailer.**
- All work happens in the `feat/lighthaus` worktree at `~/Dev/sitehaus-lighthaus`.

---

## File Structure

```
packages/monitoring/                       NEW pure core
  package.json, tsconfig.json, eslint.config.ts
  src/
    types.ts                  CheckStatus, CheckResult, MonitorType
    checks/
      http.ts                 checkHttp
      dns.ts                  checkDns
      ssl.ts                  checkSsl
      domain.ts               checkDomainExpiry
      email-dns.ts            checkEmailDns
      service-health.ts       checkServiceHealth
      heartbeat.ts            evaluateHeartbeat
      index.ts
      *.spec.ts               co-located unit tests
    incident.ts               reduceIncident + IncidentState/Transition
    incident.spec.ts
    index.ts                  re-exports

packages/db/src/monitoring/                NEW db domain
  monitors.ts, check-results.ts, incidents.ts
  monitors.relations.ts, check-results.relations.ts, incidents.relations.ts
  index.ts
packages/db/src/schema.ts                  MODIFY (merge monitoring namespace)

apps/lighthaus/                            NEW NestJS app
  package.json, tsconfig.json, tsconfig.build.json, nest-cli.json, Dockerfile
  src/
    main.ts
    app.module.ts
    config/lighthaus.config.ts
    monitors.config.ts
    db/db.module.ts, db/tokens.ts
    persistence/monitor.repository.ts
    scheduler/scheduler.service.ts
    dispatcher/dispatcher.service.ts        enqueue + Resend failsafe
    dispatcher/queue.module.ts
    heartbeat/heartbeat.controller.ts
    health/health.controller.ts
    deadman/deadman.service.ts

apps/api/src/notifications/
  notifications.types.ts                   MODIFY (+3 lighthaus.* types)
  notifications.processor.ts               MODIFY (+3 branches → ops emails)
  ops.config.ts                            NEW (OPS_RECIPIENTS)
apps/api/src/health/health.controller.ts   MODIFY ({status,uptime,version})

packages/transactional/src/render/lighthaus.tsx   NEW (3 render fns)

apps/dashboard/app/(dashboard)/status/     NEW UI
  page.tsx
  _components/{status-board,group-card,monitor-row,uptime-bar,incident-timeline}.tsx
apps/dashboard/lib/status-data.ts          server-side DB reads
apps/{web,iam,docs,commerce}/app/api/health/route.ts   NEW health routes

docker-compose.prod.yml                    MODIFY (+lighthaus service)
```

---

## Phase 1 — `@site-haus/monitoring` pure core (TDD)

### Task 1: Scaffold the `@site-haus/monitoring` package

**Files:**
- Create: `packages/monitoring/package.json`
- Create: `packages/monitoring/tsconfig.json`
- Create: `packages/monitoring/jest.config.cjs`
- Create: `packages/monitoring/eslint.config.ts`
- Create: `packages/monitoring/src/types.ts`
- Create: `packages/monitoring/src/index.ts`

**Interfaces:**
- Produces: `CheckStatus`, `CheckResult`, `MonitorType` types consumed by every later task.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@site-haus/monitoring",
  "type": "module",
  "private": true,
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "tsc -w",
    "build": "tsc",
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js",
    "check-types": "tsc --noEmit",
    "lint": "eslint src"
  },
  "devDependencies": {
    "@site-haus/eslint-config": "workspace:*",
    "@site-haus/typescript-config": "workspace:*",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.15.3",
    "eslint": "^9.31.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "5.8.2"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "extends": "@site-haus/typescript-config/base.json",
  "compilerOptions": { "outDir": "./dist", "rootDir": "src" },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `jest.config.cjs`** (ESM ts-jest, mirrors `apps/api`)

```js
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  roots: ["<rootDir>/src"],
  moduleFileExtensions: ["ts", "js", "json"],
  moduleNameMapper: { "^(\\.{1,2}/.*)\\.js$": "$1" },
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "<rootDir>/tsconfig.json" }],
  },
};
```

- [ ] **Step 4: Create `eslint.config.ts`** (re-export shared config)

```ts
import config from "@site-haus/eslint-config/base";
export default config;
```

> If `@site-haus/eslint-config` does not export `/base`, copy the exact import line used by `packages/utils/eslint.config.ts` instead.

- [ ] **Step 5: Create `src/types.ts`**

```ts
export type CheckStatus = "up" | "degraded" | "down";

export interface CheckResult {
  status: CheckStatus;
  latencyMs?: number;
  detail: Record<string, unknown>;
}

export type MonitorType =
  | "http"
  | "dns"
  | "ssl"
  | "domain"
  | "email_dns"
  | "service_health"
  | "heartbeat";
```

- [ ] **Step 6: Create `src/index.ts`**

```ts
export * from "./types.js";
```

- [ ] **Step 7: Install and verify build**

Run: `pnpm install && pnpm --filter @site-haus/monitoring build`
Expected: builds, emits `dist/types.js` and `dist/index.js`.

- [ ] **Step 8: Commit**

```bash
git add packages/monitoring pnpm-lock.yaml
git commit -m ":package: lighthaus — scaffold @site-haus/monitoring core package"
```

---

### Task 2: `checkHttp`

**Files:**
- Create: `packages/monitoring/src/checks/http.ts`
- Test: `packages/monitoring/src/checks/http.spec.ts`

**Interfaces:**
- Consumes: `CheckResult` from `../types.js`.
- Produces: `checkHttp(url: string, opts?: HttpCheckOptions): Promise<CheckResult>` where `HttpCheckOptions = { timeoutMs?: number; fetchFn?: typeof fetch; now?: () => number }`.

- [ ] **Step 1: Write the failing test**

```ts
import { checkHttp } from "./http.js";

const okFetch = async () => new Response("ok", { status: 200 });
const fiveHundred = async () => new Response("err", { status: 500 });

describe("checkHttp", () => {
  it("returns up with latency on 2xx", async () => {
    let t = 0;
    const r = await checkHttp("https://x.test", { fetchFn: okFetch, now: () => (t += 50) });
    expect(r.status).toBe("up");
    expect(r.latencyMs).toBe(50);
  });

  it("returns down on non-2xx", async () => {
    const r = await checkHttp("https://x.test", { fetchFn: fiveHundred });
    expect(r.status).toBe("down");
    expect(r.detail.httpStatus).toBe(500);
  });

  it("returns down on network throw/timeout", async () => {
    const boom = async () => { throw new Error("ECONNREFUSED"); };
    const r = await checkHttp("https://x.test", { fetchFn: boom });
    expect(r.status).toBe("down");
    expect(String(r.detail.error)).toContain("ECONNREFUSED");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @site-haus/monitoring test src/checks/http.spec.ts`
Expected: FAIL — cannot find module `./http.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @site-haus/monitoring test src/checks/http.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/monitoring/src/checks/http.ts packages/monitoring/src/checks/http.spec.ts
git commit -m ":white_check_mark: lighthaus — checkHttp uptime+latency"
```

---

### Task 3: `checkDns` — the onehealthclinics regression (SERVFAIL/REFUSED → down)

**Files:**
- Create: `packages/monitoring/src/checks/dns.ts`
- Test: `packages/monitoring/src/checks/dns.spec.ts`

**Interfaces:**
- Produces: `checkDns(host: string, resolver?: DnsResolver): Promise<CheckResult>`; `DnsResolver = { resolve4(host: string): Promise<string[]> }`.

- [ ] **Step 1: Write the failing test**

```ts
import { checkDns } from "./dns.js";

const resolverThrowing = (code: string) => ({
  resolve4: async () => { const e: NodeJS.ErrnoException = new Error(code); e.code = code; throw e; },
});

describe("checkDns", () => {
  it("up when A records resolve", async () => {
    const r = await checkDns("ok.test", { resolve4: async () => ["1.2.3.4"] });
    expect(r.status).toBe("up");
    expect(r.detail.addresses).toEqual(["1.2.3.4"]);
  });

  it("down on SERVFAIL", async () => {
    const r = await checkDns("bad.test", resolverThrowing("SERVFAIL"));
    expect(r.status).toBe("down");
    expect(r.detail.code).toBe("SERVFAIL");
  });

  it("down on REFUSED", async () => {
    const r = await checkDns("bad.test", resolverThrowing("REFUSED"));
    expect(r.status).toBe("down");
    expect(r.detail.code).toBe("REFUSED");
  });

  it("down when answer is empty (no records)", async () => {
    const r = await checkDns("empty.test", { resolve4: async () => [] });
    expect(r.status).toBe("down");
    expect(r.detail.reason).toBe("no-answer");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @site-haus/monitoring test src/checks/dns.spec.ts`
Expected: FAIL — cannot find `./dns.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @site-haus/monitoring test src/checks/dns.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/monitoring/src/checks/dns.ts packages/monitoring/src/checks/dns.spec.ts
git commit -m ":white_check_mark: lighthaus — checkDns (SERVFAIL/REFUSED/no-answer → down)"
```

---

### Task 4: `checkSsl`

**Files:**
- Create: `packages/monitoring/src/checks/ssl.ts`
- Test: `packages/monitoring/src/checks/ssl.spec.ts`

**Interfaces:**
- Produces: `checkSsl(host, opts?): Promise<CheckResult>`; `SslOptions = { warnDays?: number; probe?: SslProbe; now?: () => Date }`; `SslProbe = (host: string, port?: number) => Promise<{ validTo: Date; valid: boolean }>`.

- [ ] **Step 1: Write the failing test**

```ts
import { checkSsl } from "./ssl.js";

const now = new Date("2026-06-26T00:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);

describe("checkSsl", () => {
  it("up when valid and far from expiry", async () => {
    const r = await checkSsl("x.test", { now: () => now, probe: async () => ({ validTo: inDays(90), valid: true }) });
    expect(r.status).toBe("up");
    expect(r.detail.daysLeft).toBe(90);
  });

  it("degraded when valid but < warnDays (14) away", async () => {
    const r = await checkSsl("x.test", { warnDays: 14, now: () => now, probe: async () => ({ validTo: inDays(10), valid: true }) });
    expect(r.status).toBe("degraded");
    expect(r.detail.daysLeft).toBe(10);
  });

  it("down when expired", async () => {
    const r = await checkSsl("x.test", { now: () => now, probe: async () => ({ validTo: inDays(-1), valid: true }) });
    expect(r.status).toBe("down");
  });

  it("down when probe reports invalid", async () => {
    const r = await checkSsl("x.test", { now: () => now, probe: async () => ({ validTo: inDays(90), valid: false }) });
    expect(r.status).toBe("down");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @site-haus/monitoring test src/checks/ssl.spec.ts`
Expected: FAIL — cannot find `./ssl.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @site-haus/monitoring test src/checks/ssl.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/monitoring/src/checks/ssl.ts packages/monitoring/src/checks/ssl.spec.ts
git commit -m ":white_check_mark: lighthaus — checkSsl (degraded <14d, down expired/invalid)"
```

---

### Task 5: `checkDomainExpiry` (RDAP)

**Files:**
- Create: `packages/monitoring/src/checks/domain.ts`
- Test: `packages/monitoring/src/checks/domain.spec.ts`

**Interfaces:**
- Produces: `checkDomainExpiry(domain, opts?): Promise<CheckResult>`; `DomainOptions = { warnDays?: number; fetchRdap?: RdapFetch; now?: () => Date }`; `RdapFetch = (domain: string) => Promise<{ expiration: Date | null }>`.

- [ ] **Step 1: Write the failing test**

```ts
import { checkDomainExpiry } from "./domain.js";

const now = new Date("2026-06-26T00:00:00Z");
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);

describe("checkDomainExpiry", () => {
  it("up when expiry far away", async () => {
    const r = await checkDomainExpiry("x.test", { now: () => now, fetchRdap: async () => ({ expiration: inDays(200) }) });
    expect(r.status).toBe("up");
  });

  it("degraded when < warnDays (30)", async () => {
    const r = await checkDomainExpiry("x.test", { warnDays: 30, now: () => now, fetchRdap: async () => ({ expiration: inDays(20) }) });
    expect(r.status).toBe("degraded");
    expect(r.detail.daysLeft).toBe(20);
  });

  it("down when already expired", async () => {
    const r = await checkDomainExpiry("x.test", { now: () => now, fetchRdap: async () => ({ expiration: inDays(-2) }) });
    expect(r.status).toBe("down");
  });

  it("degraded when RDAP has no expiration data", async () => {
    const r = await checkDomainExpiry("x.test", { now: () => now, fetchRdap: async () => ({ expiration: null }) });
    expect(r.status).toBe("degraded");
    expect(r.detail.reason).toBe("no-expiration-data");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @site-haus/monitoring test src/checks/domain.spec.ts`
Expected: FAIL — cannot find `./domain.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @site-haus/monitoring test src/checks/domain.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/monitoring/src/checks/domain.ts packages/monitoring/src/checks/domain.spec.ts
git commit -m ":white_check_mark: lighthaus — checkDomainExpiry via RDAP (degraded <30d)"
```

---

### Task 6: `checkEmailDns` (MX + SPF + DKIM)

**Files:**
- Create: `packages/monitoring/src/checks/email-dns.ts`
- Test: `packages/monitoring/src/checks/email-dns.spec.ts`

**Interfaces:**
- Produces: `checkEmailDns(domain, opts?): Promise<CheckResult>`; `EmailDnsOptions = { dkimSelector?: string; resolver?: EmailDnsResolver }`; `EmailDnsResolver = { resolveMx(d): Promise<{exchange:string;priority:number}[]>; resolveTxt(n): Promise<string[][]> }`.

- [ ] **Step 1: Write the failing test**

```ts
import { checkEmailDns } from "./email-dns.js";

const healthy = {
  resolveMx: async () => [{ exchange: "aspmx.l.google.com", priority: 1 }],
  resolveTxt: async (name: string) =>
    name.startsWith("google._domainkey") ? [["v=DKIM1; k=rsa; p=ABC"]] : [["v=spf1 include:_spf.google.com ~all"]],
};

describe("checkEmailDns", () => {
  it("up when MX + SPF + DKIM all present", async () => {
    const r = await checkEmailDns("x.test", { dkimSelector: "google", resolver: healthy });
    expect(r.status).toBe("up");
  });

  it("down when MX missing", async () => {
    const r = await checkEmailDns("x.test", { dkimSelector: "google", resolver: { ...healthy, resolveMx: async () => [] } });
    expect(r.status).toBe("down");
    expect(r.detail.mx).toBe(false);
  });

  it("degraded when SPF missing", async () => {
    const r = await checkEmailDns("x.test", {
      dkimSelector: "google",
      resolver: { ...healthy, resolveTxt: async (n: string) => (n.startsWith("google._domainkey") ? [["v=DKIM1; p=ABC"]] : [["unrelated"]]) },
    });
    expect(r.status).toBe("degraded");
    expect(r.detail.spf).toBe(false);
  });

  it("degraded when DKIM missing", async () => {
    const r = await checkEmailDns("x.test", {
      dkimSelector: "google",
      resolver: { ...healthy, resolveTxt: async (n: string) => (n.startsWith("google._domainkey") ? [] : [["v=spf1 ~all"]]) },
    });
    expect(r.status).toBe("degraded");
    expect(r.detail.dkim).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @site-haus/monitoring test src/checks/email-dns.spec.ts`
Expected: FAIL — cannot find `./email-dns.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
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

export async function checkEmailDns(domain: string, opts: EmailDnsOptions = {}): Promise<CheckResult> {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @site-haus/monitoring test src/checks/email-dns.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/monitoring/src/checks/email-dns.ts packages/monitoring/src/checks/email-dns.spec.ts
git commit -m ":white_check_mark: lighthaus — checkEmailDns (MX down / SPF+DKIM degraded)"
```

---

### Task 7: `checkServiceHealth` + `evaluateHeartbeat`

**Files:**
- Create: `packages/monitoring/src/checks/service-health.ts`
- Create: `packages/monitoring/src/checks/heartbeat.ts`
- Test: `packages/monitoring/src/checks/service-health.spec.ts`
- Test: `packages/monitoring/src/checks/heartbeat.spec.ts`

**Interfaces:**
- Produces: `checkServiceHealth(url, opts?): Promise<CheckResult>` where `opts = { fetchFn?: typeof fetch; timeoutMs?: number; now?: () => number }`.
- Produces: `evaluateHeartbeat(lastSeenAt: Date | null, now: Date, maxSilenceMs: number): CheckResult` (synchronous).

- [ ] **Step 1: Write the failing tests**

`service-health.spec.ts`:
```ts
import { checkServiceHealth } from "./service-health.js";

describe("checkServiceHealth", () => {
  it("up on 200 with status ok", async () => {
    const r = await checkServiceHealth("https://svc.test/health", {
      fetchFn: async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 }),
    });
    expect(r.status).toBe("up");
  });

  it("down on non-200", async () => {
    const r = await checkServiceHealth("https://svc.test/health", {
      fetchFn: async () => new Response("nope", { status: 503 }),
    });
    expect(r.status).toBe("down");
  });

  it("down on throw", async () => {
    const r = await checkServiceHealth("https://svc.test/health", {
      fetchFn: async () => { throw new Error("ETIMEDOUT"); },
    });
    expect(r.status).toBe("down");
  });
});
```

`heartbeat.spec.ts`:
```ts
import { evaluateHeartbeat } from "./heartbeat.js";

const now = new Date("2026-06-26T00:00:00Z");

describe("evaluateHeartbeat", () => {
  it("up when last seen within window", () => {
    const r = evaluateHeartbeat(new Date(now.getTime() - 60_000), now, 180_000);
    expect(r.status).toBe("up");
  });

  it("down when silence exceeds window", () => {
    const r = evaluateHeartbeat(new Date(now.getTime() - 600_000), now, 180_000);
    expect(r.status).toBe("down");
  });

  it("down when never seen", () => {
    const r = evaluateHeartbeat(null, now, 180_000);
    expect(r.status).toBe("down");
    expect(r.detail.reason).toBe("never-seen");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @site-haus/monitoring test src/checks/service-health.spec.ts src/checks/heartbeat.spec.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write minimal implementations**

`service-health.ts`:
```ts
import type { CheckResult } from "../types.js";

export interface ServiceHealthOptions {
  fetchFn?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

export async function checkServiceHealth(url: string, opts: ServiceHealthOptions = {}): Promise<CheckResult> {
  const fetchFn = opts.fetchFn ?? fetch;
  const now = opts.now ?? (() => Date.now());
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  const start = now();
  try {
    const res = await fetchFn(url, { signal: controller.signal });
    const latencyMs = now() - start;
    if (res.status !== 200) return { status: "down", latencyMs, detail: { httpStatus: res.status } };
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
```

`heartbeat.ts`:
```ts
import type { CheckResult } from "../types.js";

export function evaluateHeartbeat(lastSeenAt: Date | null, now: Date, maxSilenceMs: number): CheckResult {
  if (!lastSeenAt) return { status: "down", detail: { reason: "never-seen" } };
  const ageMs = now.getTime() - lastSeenAt.getTime();
  if (ageMs > maxSilenceMs) return { status: "down", detail: { ageMs, reason: "stale" } };
  return { status: "up", detail: { ageMs } };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @site-haus/monitoring test src/checks/service-health.spec.ts src/checks/heartbeat.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/monitoring/src/checks/service-health.ts packages/monitoring/src/checks/heartbeat.ts packages/monitoring/src/checks/*.spec.ts
git commit -m ":white_check_mark: lighthaus — checkServiceHealth + evaluateHeartbeat"
```

---

### Task 8: Incident state machine + checks barrel + package barrel

**Files:**
- Create: `packages/monitoring/src/incident.ts`
- Test: `packages/monitoring/src/incident.spec.ts`
- Create: `packages/monitoring/src/checks/index.ts`
- Modify: `packages/monitoring/src/index.ts`

**Interfaces:**
- Produces: `IncidentState = { consecutiveFailures: number; open: boolean }`; `Transition = { kind: "none" } | { kind: "open" } | { kind: "resolve" }`; `reduceIncident(state, result, opts?: { failureThreshold?: number }): { state: IncidentState; transition: Transition }`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @site-haus/monitoring test src/incident.spec.ts`
Expected: FAIL — cannot find `./incident.js`.

- [ ] **Step 3: Write minimal implementation**

```ts
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
  // degraded while open keeps it open but does not reset failure count below current
  if (result.status === "degraded") {
    return { state: { ...state, consecutiveFailures: 0 }, transition: { kind: "none" } };
  }
  return { state: { consecutiveFailures: 0, open: state.open }, transition: { kind: "none" } };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @site-haus/monitoring test src/incident.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Create `src/checks/index.ts`**

```ts
export * from "./http.js";
export * from "./dns.js";
export * from "./ssl.js";
export * from "./domain.js";
export * from "./email-dns.js";
export * from "./service-health.js";
export * from "./heartbeat.js";
```

- [ ] **Step 6: Update `src/index.ts`**

```ts
export * from "./types.js";
export * from "./checks/index.js";
export * from "./incident.js";
```

- [ ] **Step 7: Run the full package test suite + build**

Run: `pnpm --filter @site-haus/monitoring test && pnpm --filter @site-haus/monitoring build`
Expected: all suites PASS; `dist/` emitted.

- [ ] **Step 8: Commit**

```bash
git add packages/monitoring/src
git commit -m ":white_check_mark: lighthaus — incident state machine + barrels"
```

---

## Phase 2 — Drizzle tables + migration

### Task 9: `monitoring` db domain (tables + relations + schema merge + migration)

**Files:**
- Create: `packages/db/src/monitoring/monitors.ts`
- Create: `packages/db/src/monitoring/check-results.ts`
- Create: `packages/db/src/monitoring/incidents.ts`
- Create: `packages/db/src/monitoring/check-results.relations.ts`
- Create: `packages/db/src/monitoring/incidents.relations.ts`
- Create: `packages/db/src/monitoring/index.ts`
- Modify: `packages/db/src/schema.ts`

**Interfaces:**
- Produces (consumed by `apps/lighthaus` and dashboard): `monitorsTable`, `checkResultsTable`, `incidentsTable` and inferred types `Monitor`, `NewMonitor`, `CheckResult` (DB row), `NewCheckResult`, `Incident`, `NewIncident`.

- [ ] **Step 1: Create `monitors.ts`**

```ts
import { boolean, index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const monitorsTable = pgTable(
  "monitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    target: varchar("target", { length: 256 }).notNull(),
    group: varchar("group", { length: 32 }).notNull(),
    thresholds: jsonb("thresholds"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("monitors_group_idx").on(t.group), index("monitors_enabled_idx").on(t.enabled)],
);

export type Monitor = typeof monitorsTable.$inferSelect;
export type NewMonitor = typeof monitorsTable.$inferInsert;
```

- [ ] **Step 2: Create `check-results.ts`**

```ts
import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { monitorsTable } from "./monitors.js";

export const checkResultsTable = pgTable(
  "check_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitorsTable.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull(),
    latencyMs: integer("latency_ms"),
    detail: jsonb("detail"),
    checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("check_results_monitor_checked_idx").on(t.monitorId, t.checkedAt)],
);

export type CheckResultRow = typeof checkResultsTable.$inferSelect;
export type NewCheckResult = typeof checkResultsTable.$inferInsert;
```

> Named `CheckResultRow` to avoid colliding with the core `CheckResult` shape when both are imported.

- [ ] **Step 3: Create `incidents.ts`**

```ts
import { boolean, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { monitorsTable } from "./monitors.js";

export const incidentsTable = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    monitorId: uuid("monitor_id")
      .notNull()
      .references(() => monitorsTable.id, { onDelete: "cascade" }),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    lastStatus: varchar("last_status", { length: 16 }).notNull(),
    notifiedOpen: boolean("notified_open").notNull().default(false),
    notifiedResolved: boolean("notified_resolved").notNull().default(false),
  },
  (t) => [index("incidents_monitor_idx").on(t.monitorId), index("incidents_open_idx").on(t.resolvedAt)],
);

export type Incident = typeof incidentsTable.$inferSelect;
export type NewIncident = typeof incidentsTable.$inferInsert;
```

- [ ] **Step 4: Create the relations files**

`check-results.relations.ts`:
```ts
import { relations } from "drizzle-orm";
import { checkResultsTable } from "./check-results.js";
import { monitorsTable } from "./monitors.js";

export const checkResultsRelations = relations(checkResultsTable, ({ one }) => ({
  monitor: one(monitorsTable, { fields: [checkResultsTable.monitorId], references: [monitorsTable.id] }),
}));
```

`incidents.relations.ts`:
```ts
import { relations } from "drizzle-orm";
import { incidentsTable } from "./incidents.js";
import { monitorsTable } from "./monitors.js";

export const incidentsRelations = relations(incidentsTable, ({ one }) => ({
  monitor: one(monitorsTable, { fields: [incidentsTable.monitorId], references: [monitorsTable.id] }),
}));
```

- [ ] **Step 5: Create `monitoring/index.ts`**

```ts
export * from "./monitors.js";
export * from "./check-results.js";
export * from "./check-results.relations.js";
export * from "./incidents.js";
export * from "./incidents.relations.js";
```

- [ ] **Step 6: Merge into `schema.ts`**

Modify `packages/db/src/schema.ts` to add the monitoring namespace:

```ts
export * from "./core/index.js";
export * from "./iam/index.js";
export * from "./monitoring/index.js";

import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as core from "./core/index.js";
import * as iam from "./iam/index.js";
import * as monitoring from "./monitoring/index.js";
// ... keep existing drizzle-orm operator re-exports ...

export const schema = {
  ...iam,
  ...core,
  ...monitoring,
} as const;
```

- [ ] **Step 7: Build, generate, and inspect the migration**

Run:
```bash
pnpm --filter @site-haus/db build
cd packages/db && pnpm db:gen
```
Expected: a new SQL migration appears in `packages/db/migrations/` creating `monitors`, `check_results`, `incidents` with the indexes above. **Read the SQL** to confirm snake_case columns and the composite `check_results (monitor_id, checked_at)` index.

- [ ] **Step 8: Commit**

```bash
git add packages/db/src/monitoring packages/db/src/schema.ts packages/db/migrations
git commit -m ":card_file_box: lighthaus — monitors/check_results/incidents tables + migration"
```

> Migration is applied against the live DB with `pnpm db:migrate` during deploy (Phase 8), not here.

---

## Phase 3 — `apps/lighthaus` NestJS app (scheduler, persistence, config)

### Task 10: Scaffold `apps/lighthaus` Nest app + config + db module

**Files:**
- Create: `apps/lighthaus/package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `eslint.config.mjs`
- Create: `apps/lighthaus/src/main.ts`, `app.module.ts`
- Create: `apps/lighthaus/src/config/lighthaus.config.ts`
- Create: `apps/lighthaus/src/db/tokens.ts`, `src/db/db.module.ts`

**Interfaces:**
- Produces: `LIGHTHAUS_DB` injection token → `Db`; `lighthausConfig` (ConfigService namespace `lighthaus`) with `{ databaseUrl, redisUrl, resendApiKey, emailFrom, opsRecipients: string[], healthchecksUrl, dashboardUrl, heartbeatPort }`.

- [ ] **Step 1: Create `package.json`** (mirrors commerce `worker`, plus deps)

```json
{
  "name": "lighthaus",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "build": "nest build",
    "dev": "nest start --watch",
    "start": "node dist/main",
    "check-types": "tsc --noEmit",
    "lint": "prettier --check \"src/**/*.ts\"",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "@nestjs/bullmq": "^11.0.4",
    "@nestjs/common": "^11.1.6",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.1.6",
    "@nestjs/platform-express": "^11.1.6",
    "@nestjs/schedule": "^6.0.0",
    "@site-haus/db": "workspace:*",
    "@site-haus/monitoring": "workspace:*",
    "@site-haus/transactional": "workspace:*",
    "bullmq": "^5.70.1",
    "pg": "^8.16.3",
    "reflect-metadata": "^0.2.2",
    "resend": "^6.5.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "@nestjs/testing": "^11.1.6",
    "@types/jest": "^29.5.12",
    "@types/node": "^22.15.3",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "5.8.2"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.ts$": ["ts-jest", { "tsconfig": "tsconfig.json" }] },
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Create `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`**

`nest-cli.json`:
```json
{ "$schema": "https://json.schemastore.org/nest-cli", "collection": "@nestjs/schematics", "sourceRoot": "src", "compilerOptions": { "deleteOutDir": true } }
```
`tsconfig.json` — copy `apps/api/tsconfig.json` verbatim (CommonJS Nest settings, `experimentalDecorators`, `emitDecoratorMetadata`).
`tsconfig.build.json`:
```json
{ "extends": "./tsconfig.json", "exclude": ["node_modules", "dist", "**/*.spec.ts"] }
```
`eslint.config.mjs` — copy `apps/api/eslint.config.mjs`.

- [ ] **Step 3: Create `config/lighthaus.config.ts`**

```ts
import { registerAs } from "@nestjs/config";

export default registerAs("lighthaus", () => ({
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? "redis://redis:6379",
  resendApiKey: process.env.RESEND_API_KEY!,
  emailFrom: process.env.EMAIL_FROM ?? "Lighthaus <alerts@sitehaus.co>",
  opsRecipients: (process.env.OPS_RECIPIENTS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  healthchecksUrl: process.env.HEALTHCHECKS_URL ?? "",
  dashboardUrl: process.env.DASHBOARD_URL ?? "https://dashboard.sitehaus.co",
  heartbeatPort: Number(process.env.LIGHTHAUS_PORT ?? 3006),
}));
```

- [ ] **Step 4: Create `db/tokens.ts` and `db/db.module.ts`**

`tokens.ts`:
```ts
export const LIGHTHAUS_DB = Symbol("LIGHTHAUS_DB");
```
`db.module.ts`:
```ts
import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDb } from "@site-haus/db";
import { Pool } from "pg";
import { LIGHTHAUS_DB } from "./tokens.js";

@Global()
@Module({
  providers: [
    {
      provide: LIGHTHAUS_DB,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createDb(new Pool({ connectionString: config.get<string>("lighthaus.databaseUrl") })),
    },
  ],
  exports: [LIGHTHAUS_DB],
})
export class DbModule {}
```

- [ ] **Step 5: Create `main.ts` and `app.module.ts`**

`app.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import lighthausConfig from "./config/lighthaus.config.js";
import { DbModule } from "./db/db.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [lighthausConfig] }),
    ScheduleModule.forRoot(),
    DbModule,
  ],
})
export class AppModule {}
```
`main.ts`:
```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>("lighthaus.heartbeatPort")!;
  await app.listen(port);
  Logger.log(`Lighthaus listening on :${port}`, "Bootstrap");
}
bootstrap();
```

- [ ] **Step 6: Install + build**

Run: `pnpm install && pnpm --filter lighthaus build`
Expected: builds; `apps/lighthaus/dist/main.js` exists.

- [ ] **Step 7: Commit**

```bash
git add apps/lighthaus pnpm-lock.yaml
git commit -m ":sparkles: lighthaus — scaffold NestJS app shell + config + db module"
```

---

### Task 11: Persistence repository (config sync + write results + incident rows)

**Files:**
- Create: `apps/lighthaus/src/monitors.config.ts`
- Create: `apps/lighthaus/src/persistence/monitor.repository.ts`
- Test: `apps/lighthaus/src/persistence/monitor.repository.spec.ts`

**Interfaces:**
- Consumes: `LIGHTHAUS_DB`, `monitorsTable`, `checkResultsTable`, `incidentsTable` from `@site-haus/db`; `MonitorType` from `@site-haus/monitoring`.
- Produces: `MonitorConfig` type; `monitors: MonitorConfig[]`; `MonitorRepository` with `syncFromConfig(configs): Promise<void>`, `listEnabled(): Promise<Monitor[]>`, `recordResult(monitorId, result): Promise<void>`, `getOpenIncident(monitorId): Promise<Incident | null>`, `openIncident(monitorId, status): Promise<Incident>`, `resolveIncident(incidentId): Promise<void>`, `getLastHeartbeat(target): Promise<Date | null>`, `uptime24h(monitorId): Promise<number>`.

- [ ] **Step 1: Create `monitors.config.ts`**

```ts
import type { MonitorType } from "@site-haus/monitoring";

export type MonitorGroup = "client-site" | "sh-service" | "commerce-service";

export interface MonitorCheck {
  type: MonitorType;
  target: string;
  thresholds?: Record<string, number | string>;
}

export interface MonitorConfig {
  name: string;
  group: MonitorGroup;
  checks: MonitorCheck[];
}

export const monitors: MonitorConfig[] = [
  {
    name: "onehealthclinics.com",
    group: "client-site",
    checks: [
      { type: "http", target: "https://onehealthclinics.com" },
      { type: "dns", target: "onehealthclinics.com" },
      { type: "ssl", target: "onehealthclinics.com", thresholds: { sslWarnDays: 14 } },
      { type: "domain", target: "onehealthclinics.com", thresholds: { domainWarnDays: 30 } },
      { type: "email_dns", target: "onehealthclinics.com", thresholds: { dkimSelector: "google" } },
    ],
  },
  {
    name: "sitehaus-api",
    group: "sh-service",
    checks: [{ type: "service_health", target: "https://api.sitehaus.co/health" }],
  },
  {
    name: "commerce-worker",
    group: "commerce-service",
    checks: [{ type: "heartbeat", target: "commerce-worker", thresholds: { maxSilenceMs: 180000 } }],
  },
];
```

> Confirm production hostnames against spec §12 before deploy; placeholders here are structurally correct.

- [ ] **Step 2: Write the failing test** (uptime calc is the pure-enough unit to pin)

```ts
import { computeUptimePct } from "./monitor.repository.js";

describe("computeUptimePct", () => {
  it("100% when all up", () => {
    expect(computeUptimePct([{ status: "up" }, { status: "up" }])).toBe(100);
  });
  it("50% when half down", () => {
    expect(computeUptimePct([{ status: "up" }, { status: "down" }])).toBe(50);
  });
  it("degraded counts as up for availability", () => {
    expect(computeUptimePct([{ status: "degraded" }, { status: "up" }])).toBe(100);
  });
  it("returns 100 when no samples", () => {
    expect(computeUptimePct([])).toBe(100);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter lighthaus test src/persistence/monitor.repository.spec.ts`
Expected: FAIL — `computeUptimePct` not exported.

- [ ] **Step 4: Implement `monitor.repository.ts`**

```ts
import { Inject, Injectable } from "@nestjs/common";
import {
  and, desc, eq, gte, isNull, schema, sql, type Db,
} from "@site-haus/db";
import type { CheckResult } from "@site-haus/monitoring";
import { LIGHTHAUS_DB } from "../db/tokens.js";
import type { MonitorConfig } from "../monitors.config.js";

type Monitor = typeof schema.monitorsTable.$inferSelect;
type Incident = typeof schema.incidentsTable.$inferSelect;

export function computeUptimePct(rows: { status: string }[]): number {
  if (rows.length === 0) return 100;
  const upish = rows.filter((r) => r.status !== "down").length;
  return Math.round((upish / rows.length) * 100);
}

@Injectable()
export class MonitorRepository {
  constructor(@Inject(LIGHTHAUS_DB) private readonly db: Db) {}

  async syncFromConfig(configs: MonitorConfig[]): Promise<void> {
    for (const cfg of configs) {
      for (const check of cfg.checks) {
        const existing = await this.db.query.monitorsTable.findFirst({
          where: and(
            eq(schema.monitorsTable.name, cfg.name),
            eq(schema.monitorsTable.type, check.type),
            eq(schema.monitorsTable.target, check.target),
          ),
        });
        if (existing) {
          await this.db
            .update(schema.monitorsTable)
            .set({ group: cfg.group, thresholds: check.thresholds ?? null, updatedAt: new Date() })
            .where(eq(schema.monitorsTable.id, existing.id));
        } else {
          await this.db.insert(schema.monitorsTable).values({
            name: cfg.name, type: check.type, target: check.target,
            group: cfg.group, thresholds: check.thresholds ?? null,
          });
        }
      }
    }
  }

  listEnabled(): Promise<Monitor[]> {
    return this.db.query.monitorsTable.findMany({ where: eq(schema.monitorsTable.enabled, true) });
  }

  async recordResult(monitorId: string, result: CheckResult): Promise<void> {
    await this.db.insert(schema.checkResultsTable).values({
      monitorId, status: result.status, latencyMs: result.latencyMs ?? null, detail: result.detail,
    });
  }

  async getOpenIncident(monitorId: string): Promise<Incident | null> {
    const row = await this.db.query.incidentsTable.findFirst({
      where: and(eq(schema.incidentsTable.monitorId, monitorId), isNull(schema.incidentsTable.resolvedAt)),
    });
    return row ?? null;
  }

  async openIncident(monitorId: string, lastStatus: string): Promise<Incident> {
    const [row] = await this.db
      .insert(schema.incidentsTable)
      .values({ monitorId, lastStatus, notifiedOpen: true })
      .returning();
    return row;
  }

  async resolveIncident(incidentId: string): Promise<void> {
    await this.db
      .update(schema.incidentsTable)
      .set({ resolvedAt: new Date(), notifiedResolved: true, lastStatus: "up" })
      .where(eq(schema.incidentsTable.id, incidentId));
  }

  async getLastHeartbeat(target: string): Promise<Date | null> {
    const monitor = await this.db.query.monitorsTable.findFirst({
      where: and(eq(schema.monitorsTable.type, "heartbeat"), eq(schema.monitorsTable.target, target)),
    });
    if (!monitor) return null;
    const last = await this.db.query.checkResultsTable.findFirst({
      where: and(eq(schema.checkResultsTable.monitorId, monitor.id), eq(schema.checkResultsTable.status, "up")),
      orderBy: desc(schema.checkResultsTable.checkedAt),
    });
    return last?.checkedAt ?? null;
  }

  async uptime24h(monitorId: string): Promise<number> {
    const since = new Date(Date.now() - 24 * 3_600_000);
    const rows = await this.db.query.checkResultsTable.findMany({
      where: and(eq(schema.checkResultsTable.monitorId, monitorId), gte(schema.checkResultsTable.checkedAt, since)),
      columns: { status: true },
    });
    return computeUptimePct(rows);
  }
}
```

> `getLastHeartbeat` reads the latest `up` check_result for a heartbeat monitor; the heartbeat ingest (Task 14) writes an `up` result on each POST. This keeps heartbeat state in `check_results` — no extra table.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter lighthaus test src/persistence/monitor.repository.spec.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/lighthaus/src/monitors.config.ts apps/lighthaus/src/persistence
git commit -m ":sparkles: lighthaus — monitors.config + MonitorRepository (sync/results/incidents/uptime)"
```

---

### Task 12: Dispatcher — enqueue `lighthaus.*` with Resend failsafe

**Files:**
- Create: `apps/lighthaus/src/dispatcher/queue.module.ts`
- Create: `apps/lighthaus/src/dispatcher/dispatcher.service.ts`
- Test: `apps/lighthaus/src/dispatcher/dispatcher.service.spec.ts`

**Interfaces:**
- Consumes: `lighthausConfig` (opsRecipients, resendApiKey, emailFrom, dashboardUrl), BullMQ queue named `"notifications"`.
- Produces: `LighthausJob` union (mirrors api `notifications.types.ts` additions in Task 15); `DispatcherService.dispatch(job: LighthausJob): Promise<void>` — tries `queue.add(job.type, job, {...})`; on throw, renders + Resend-sends directly to ops.

- [ ] **Step 1: Write the failing test (Redis-down → Resend failsafe)**

```ts
import { Test } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { getQueueToken } from "@nestjs/bullmq";
import { DispatcherService, RESEND_CLIENT, type LighthausJob } from "./dispatcher.service.js";

const job: LighthausJob = {
  type: "lighthaus.incident_opened",
  monitorId: "m1", monitorName: "onehealthclinics.com", group: "client-site",
  status: "down", detail: { code: "SERVFAIL" }, openedAt: new Date().toISOString(),
};

describe("DispatcherService", () => {
  it("enqueues onto the notifications queue when Redis is healthy", async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const send = jest.fn();
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => ({ lighthaus: { opsRecipients: ["ops@x.test"], emailFrom: "a@x.test", dashboardUrl: "https://d.test" } })] })],
      providers: [
        DispatcherService,
        { provide: getQueueToken("notifications"), useValue: { add } },
        { provide: RESEND_CLIENT, useValue: { emails: { send } } },
      ],
    }).compile();
    await mod.get(DispatcherService).dispatch(job);
    expect(add).toHaveBeenCalledWith("lighthaus.incident_opened", job, expect.any(Object));
    expect(send).not.toHaveBeenCalled();
  });

  it("falls back to direct Resend send when enqueue throws", async () => {
    const add = jest.fn().mockRejectedValue(new Error("Redis down"));
    const send = jest.fn().mockResolvedValue({ data: { id: "x" } });
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => ({ lighthaus: { opsRecipients: ["ops@x.test"], emailFrom: "a@x.test", dashboardUrl: "https://d.test" } })] })],
      providers: [
        DispatcherService,
        { provide: getQueueToken("notifications"), useValue: { add } },
        { provide: RESEND_CLIENT, useValue: { emails: { send } } },
      ],
    }).compile();
    await mod.get(DispatcherService).dispatch(job);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toEqual(["ops@x.test"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lighthaus test src/dispatcher/dispatcher.service.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `queue.module.ts` + `dispatcher.service.ts`**

`queue.module.ts`:
```ts
import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { DispatcherService, RESEND_CLIENT } from "./dispatcher.service.js";

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ connection: { url: config.get<string>("lighthaus.redisUrl") } }),
    }),
    BullModule.registerQueue({ name: "notifications" }),
  ],
  providers: [
    DispatcherService,
    { provide: RESEND_CLIENT, inject: [ConfigService], useFactory: (c: ConfigService) => new Resend(c.get<string>("lighthaus.resendApiKey")) },
  ],
  exports: [DispatcherService],
})
export class QueueModule {}
```

`dispatcher.service.ts`:
```ts
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import type { Resend } from "resend";

export const RESEND_CLIENT = Symbol("RESEND_CLIENT");

export type LighthausJob =
  | { type: "lighthaus.incident_opened"; monitorId: string; monitorName: string; group: string; status: string; detail: Record<string, unknown>; openedAt: string }
  | { type: "lighthaus.incident_resolved"; monitorId: string; monitorName: string; group: string; openedAt: string; resolvedAt: string; downtimeMs: number }
  | { type: "lighthaus.daily_digest"; date: string; summary: { monitorName: string; group: string; uptime24h: number; status: string }[]; openIncidents: { monitorName: string; openedAt: string }[] };

@Injectable()
export class DispatcherService {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    @InjectQueue("notifications") private readonly queue: Queue,
    @Inject(RESEND_CLIENT) private readonly resend: Resend,
    private readonly config: ConfigService,
  ) {}

  async dispatch(job: LighthausJob): Promise<void> {
    try {
      await this.queue.add(job.type, job, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      });
    } catch (err) {
      this.logger.error(`Enqueue failed (${job.type}); using Resend failsafe`, err as Error);
      await this.failsafeSend(job);
    }
  }

  private async failsafeSend(job: LighthausJob): Promise<void> {
    const to = this.config.get<string[]>("lighthaus.opsRecipients") ?? [];
    if (to.length === 0) return;
    const subject = this.subjectFor(job);
    await this.resend.emails.send({
      from: this.config.get<string>("lighthaus.emailFrom")!,
      to,
      subject,
      text: `${subject}\n\nLighthaus could not reach Redis; this is a direct failsafe alert.\n\n${JSON.stringify(job, null, 2)}`,
    });
  }

  private subjectFor(job: LighthausJob): string {
    switch (job.type) {
      case "lighthaus.incident_opened": return `🔴 DOWN: ${job.monitorName}`;
      case "lighthaus.incident_resolved": return `🟢 RECOVERED: ${job.monitorName}`;
      case "lighthaus.daily_digest": return `Lighthaus daily digest — ${job.date}`;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter lighthaus test src/dispatcher/dispatcher.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/lighthaus/src/dispatcher
git commit -m ":sparkles: lighthaus — dispatcher (enqueue lighthaus.* + Resend failsafe)"
```

---

### Task 13: Scheduler — run due checks, drive incidents, dispatch, deadman, digest

**Files:**
- Create: `apps/lighthaus/src/scheduler/check-runner.ts`
- Create: `apps/lighthaus/src/scheduler/scheduler.service.ts`
- Create: `apps/lighthaus/src/deadman/deadman.service.ts`
- Test: `apps/lighthaus/src/scheduler/check-runner.spec.ts`
- Modify: `apps/lighthaus/src/app.module.ts` (register QueueModule + providers)

**Interfaces:**
- Consumes: all `@site-haus/monitoring` checks, `MonitorRepository`, `DispatcherService`, `reduceIncident`.
- Produces: `runCheck(monitor, deps): Promise<CheckResult>` (pure dispatch by `monitor.type`); `SchedulerService` with `@Interval` fast loop (120s) + `@Cron` daily (slow checks) + `@Cron` 08:00 digest.

- [ ] **Step 1: Write the failing test for `runCheck` dispatch**

```ts
import { runCheck } from "./check-runner.js";

const monitor = (type: string, target = "x.test") => ({ id: "m", name: "n", type, target, group: "sh-service", thresholds: {}, enabled: true } as never);

describe("runCheck", () => {
  it("routes http monitors to checkHttp", async () => {
    const r = await runCheck(monitor("http", "https://x.test"), {
      checkHttp: async () => ({ status: "up", detail: {} }),
    } as never);
    expect(r.status).toBe("up");
  });

  it("routes heartbeat monitors through evaluateHeartbeat with last-seen", async () => {
    const r = await runCheck(monitor("heartbeat", "svc"), {
      getLastHeartbeat: async () => new Date(),
      evaluateHeartbeat: () => ({ status: "up", detail: {} }),
    } as never);
    expect(r.status).toBe("up");
  });

  it("returns down for an unknown monitor type", async () => {
    const r = await runCheck(monitor("bogus"), {} as never);
    expect(r.status).toBe("down");
    expect(r.detail.reason).toBe("unknown-type");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lighthaus test src/scheduler/check-runner.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `check-runner.ts`**

```ts
import {
  checkDns, checkDomainExpiry, checkEmailDns, checkHttp, checkServiceHealth, checkSsl, evaluateHeartbeat,
  type CheckResult,
} from "@site-haus/monitoring";

type Monitor = { id: string; type: string; target: string; thresholds: Record<string, number | string> | null };

export interface CheckDeps {
  checkHttp: typeof checkHttp;
  checkDns: typeof checkDns;
  checkSsl: typeof checkSsl;
  checkDomainExpiry: typeof checkDomainExpiry;
  checkEmailDns: typeof checkEmailDns;
  checkServiceHealth: typeof checkServiceHealth;
  evaluateHeartbeat: typeof evaluateHeartbeat;
  getLastHeartbeat: (target: string) => Promise<Date | null>;
}

export const realDeps: Omit<CheckDeps, "getLastHeartbeat"> = {
  checkHttp, checkDns, checkSsl, checkDomainExpiry, checkEmailDns, checkServiceHealth, evaluateHeartbeat,
};

export async function runCheck(monitor: Monitor, deps: Partial<CheckDeps>): Promise<CheckResult> {
  const t = monitor.thresholds ?? {};
  switch (monitor.type) {
    case "http": return deps.checkHttp!(monitor.target);
    case "dns": return deps.checkDns!(monitor.target);
    case "ssl": return deps.checkSsl!(monitor.target, { warnDays: Number(t.sslWarnDays ?? 14) });
    case "domain": return deps.checkDomainExpiry!(monitor.target, { warnDays: Number(t.domainWarnDays ?? 30) });
    case "email_dns": return deps.checkEmailDns!(monitor.target, { dkimSelector: String(t.dkimSelector ?? "google") });
    case "service_health": return deps.checkServiceHealth!(monitor.target);
    case "heartbeat": {
      const lastSeen = await deps.getLastHeartbeat!(monitor.target);
      return deps.evaluateHeartbeat!(lastSeen, new Date(), Number(t.maxSilenceMs ?? 180_000));
    }
    default: return { status: "down", detail: { reason: "unknown-type", type: monitor.type } };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter lighthaus test src/scheduler/check-runner.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `deadman.service.ts`**

```ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DeadmanService {
  private readonly logger = new Logger(DeadmanService.name);
  constructor(private readonly config: ConfigService) {}

  async ping(): Promise<void> {
    const url = this.config.get<string>("lighthaus.healthchecksUrl");
    if (!url) return;
    try {
      await fetch(url, { method: "GET" });
    } catch (err) {
      this.logger.warn(`healthchecks.io ping failed: ${(err as Error).message}`);
    }
  }
}
```

- [ ] **Step 6: Implement `scheduler.service.ts`**

```ts
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, Interval } from "@nestjs/schedule";
import { reduceIncident, type CheckResult, type IncidentState } from "@site-haus/monitoring";
import { MonitorRepository } from "../persistence/monitor.repository.js";
import { DispatcherService } from "../dispatcher/dispatcher.service.js";
import { DeadmanService } from "../deadman/deadman.service.js";
import { monitors as monitorConfig } from "../monitors.config.js";
import { realDeps, runCheck, type CheckDeps } from "./check-runner.js";

const SLOW_TYPES = new Set(["ssl", "domain", "email_dns"]);

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly states = new Map<string, IncidentState>();

  constructor(
    private readonly repo: MonitorRepository,
    private readonly dispatcher: DispatcherService,
    private readonly deadman: DeadmanService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.repo.syncFromConfig(monitorConfig);
  }

  private deps(): Partial<CheckDeps> {
    return { ...realDeps, getLastHeartbeat: (target) => this.repo.getLastHeartbeat(target) };
  }

  @Interval(120_000)
  async fastCycle(): Promise<void> {
    await this.runGroup((type) => !SLOW_TYPES.has(type));
    await this.deadman.ping();
  }

  @Cron("0 6 * * *") // daily 06:00 — slow checks
  async slowCycle(): Promise<void> {
    await this.runGroup((type) => SLOW_TYPES.has(type));
  }

  private async runGroup(predicate: (type: string) => boolean): Promise<void> {
    const all = await this.repo.listEnabled();
    for (const monitor of all.filter((m) => predicate(m.type))) {
      try {
        const result = await runCheck(monitor, this.deps());
        await this.repo.recordResult(monitor.id, result);
        await this.evaluateIncident(monitor, result);
      } catch (err) {
        this.logger.error(`Check failed for ${monitor.name}/${monitor.type}`, err as Error);
      }
    }
  }

  private async evaluateIncident(
    monitor: Awaited<ReturnType<MonitorRepository["listEnabled"]>>[number],
    result: CheckResult,
  ): Promise<void> {
    const prev = this.states.get(monitor.id) ?? { consecutiveFailures: 0, open: false };
    const { state, transition } = reduceIncident(prev, result);
    this.states.set(monitor.id, state);

    if (transition.kind === "open") {
      const incident = await this.repo.openIncident(monitor.id, result.status);
      await this.dispatcher.dispatch({
        type: "lighthaus.incident_opened",
        monitorId: monitor.id, monitorName: monitor.name, group: monitor.group,
        status: result.status, detail: result.detail, openedAt: incident.openedAt.toISOString(),
      });
    } else if (transition.kind === "resolve") {
      const open = await this.repo.getOpenIncident(monitor.id);
      if (open) {
        await this.repo.resolveIncident(open.id);
        await this.dispatcher.dispatch({
          type: "lighthaus.incident_resolved",
          monitorId: monitor.id, monitorName: monitor.name, group: monitor.group,
          openedAt: open.openedAt.toISOString(), resolvedAt: new Date().toISOString(),
          downtimeMs: Date.now() - open.openedAt.getTime(),
        });
      }
    }
  }

  @Cron("0 8 * * *") // daily 08:00 digest
  async dailyDigest(): Promise<void> {
    const all = await this.repo.listEnabled();
    const summary = await Promise.all(
      all.map(async (m) => ({ monitorName: m.name, group: m.group, uptime24h: await this.repo.uptime24h(m.id), status: "up" })),
    );
    const openIncidents: { monitorName: string; openedAt: string }[] = [];
    for (const m of all) {
      const open = await this.repo.getOpenIncident(m.id);
      if (open) openIncidents.push({ monitorName: m.name, openedAt: open.openedAt.toISOString() });
    }
    await this.dispatcher.dispatch({ type: "lighthaus.daily_digest", date: new Date().toISOString().slice(0, 10), summary, openIncidents });
  }
}
```

> Incident state is rehydrated lazily per-process; on restart, `getOpenIncident` still prevents duplicate open rows because `openIncident` is only called on the `open` transition and the resolve path checks for an existing open incident. Persisted incidents are the source of truth for the UI.

- [ ] **Step 7: Wire providers into `app.module.ts`**

Add to `app.module.ts` imports `QueueModule` and to a new providers array `MonitorRepository, SchedulerService, DeadmanService`:
```ts
import { QueueModule } from "./dispatcher/queue.module.js";
import { MonitorRepository } from "./persistence/monitor.repository.js";
import { SchedulerService } from "./scheduler/scheduler.service.js";
import { DeadmanService } from "./deadman/deadman.service.js";
// imports: [...existing, QueueModule]
// providers: [MonitorRepository, SchedulerService, DeadmanService]
```

- [ ] **Step 8: Build the app**

Run: `pnpm --filter lighthaus build`
Expected: compiles clean.

- [ ] **Step 9: Commit**

```bash
git add apps/lighthaus/src
git commit -m ":sparkles: lighthaus — scheduler (fast/slow cycles, incidents, digest, deadman)"
```

---

### Task 14: Heartbeat ingest + lighthaus self-health endpoints

**Files:**
- Create: `apps/lighthaus/src/heartbeat/heartbeat.controller.ts`
- Create: `apps/lighthaus/src/health/health.controller.ts`
- Test: `apps/lighthaus/src/heartbeat/heartbeat.controller.spec.ts`
- Modify: `apps/lighthaus/src/app.module.ts` (register controllers)

**Interfaces:**
- Consumes: `MonitorRepository.recordResult` + a heartbeat monitor row (created by config sync; ensure config includes the heartbeat target).
- Produces: `POST /heartbeat { service: string }` → records an `up` check_result for that heartbeat monitor; `GET /health` → `{ status, uptime, version }`.

- [ ] **Step 1: Write the failing test**

```ts
import { Test } from "@nestjs/testing";
import { HeartbeatController } from "./heartbeat.controller.js";
import { MonitorRepository } from "../persistence/monitor.repository.js";

describe("HeartbeatController", () => {
  it("records an up result for the named service heartbeat monitor", async () => {
    const recordHeartbeat = jest.fn().mockResolvedValue(undefined);
    const mod = await Test.createTestingModule({
      controllers: [HeartbeatController],
      providers: [{ provide: MonitorRepository, useValue: { recordHeartbeat } }],
    }).compile();
    const res = await mod.get(HeartbeatController).ingest({ service: "commerce-worker" });
    expect(res).toEqual({ ok: true });
    expect(recordHeartbeat).toHaveBeenCalledWith("commerce-worker");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter lighthaus test src/heartbeat/heartbeat.controller.spec.ts`
Expected: FAIL — controller + `recordHeartbeat` missing.

- [ ] **Step 3: Add `recordHeartbeat` to `MonitorRepository`**

Append to `monitor.repository.ts`:
```ts
  async recordHeartbeat(target: string): Promise<void> {
    const monitor = await this.db.query.monitorsTable.findFirst({
      where: and(eq(schema.monitorsTable.type, "heartbeat"), eq(schema.monitorsTable.target, target)),
    });
    if (!monitor) return;
    await this.recordResult(monitor.id, { status: "up", detail: { source: "heartbeat-ingest" } });
  }
```

- [ ] **Step 4: Implement the controllers**

`heartbeat.controller.ts`:
```ts
import { Body, Controller, Post } from "@nestjs/common";
import { MonitorRepository } from "../persistence/monitor.repository.js";

@Controller("heartbeat")
export class HeartbeatController {
  constructor(private readonly repo: MonitorRepository) {}

  @Post()
  async ingest(@Body() body: { service: string }): Promise<{ ok: true }> {
    await this.repo.recordHeartbeat(body.service);
    return { ok: true };
  }
}
```
`health.controller.ts`:
```ts
import { Controller, Get } from "@nestjs/common";

const startedAt = Date.now();

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return { status: "ok", uptime: Math.floor((Date.now() - startedAt) / 1000), version: process.env.APP_VERSION ?? "dev" };
  }
}
```

- [ ] **Step 5: Register controllers in `app.module.ts`**

Add `controllers: [HeartbeatController, HealthController]` to the `@Module`.

- [ ] **Step 6: Run test + build**

Run: `pnpm --filter lighthaus test src/heartbeat/heartbeat.controller.spec.ts && pnpm --filter lighthaus build`
Expected: PASS + clean build.

- [ ] **Step 7: Commit**

```bash
git add apps/lighthaus/src
git commit -m ":sparkles: lighthaus — heartbeat ingest + self-health endpoint"
```

---

## Phase 4 — `api` integration (job types, processor, ops recipients, health upgrade)

### Task 15: Extend `NotificationJobData` + ops config

**Files:**
- Modify: `apps/api/src/notifications/notifications.types.ts`
- Create: `apps/api/src/notifications/ops.config.ts`

**Interfaces:**
- Produces: three new members on `NotificationJobData` matching `LighthausJob` from Task 12 **exactly** (same property names/types); `opsConfig` (namespace `ops`) with `recipients: string[]`.

- [ ] **Step 1: Append to `notifications.types.ts`**

```ts
  | {
      type: 'lighthaus.incident_opened';
      monitorId: string;
      monitorName: string;
      group: string;
      status: string;
      detail: Record<string, unknown>;
      openedAt: string;
    }
  | {
      type: 'lighthaus.incident_resolved';
      monitorId: string;
      monitorName: string;
      group: string;
      openedAt: string;
      resolvedAt: string;
      downtimeMs: number;
    }
  | {
      type: 'lighthaus.daily_digest';
      date: string;
      summary: { monitorName: string; group: string; uptime24h: number; status: string }[];
      openIncidents: { monitorName: string; openedAt: string }[];
    };
```
(Insert before the final `;` of the union — i.e. continue the `|` chain.)

- [ ] **Step 2: Create `ops.config.ts`**

```ts
import { registerAs } from '@nestjs/config';

export default registerAs('ops', () => ({
  recipients: (process.env.OPS_RECIPIENTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
}));
```

- [ ] **Step 3: Register `opsConfig`** in the api config loader (wherever `ConfigModule.forRoot({ load: [...] })` lists configs — typically `app.module.ts`). Add `opsConfig` to the `load` array.

- [ ] **Step 4: Type-check**

Run: `pnpm --filter api check-types`
Expected: passes (no consumers yet beyond the union).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/notifications/notifications.types.ts apps/api/src/notifications/ops.config.ts apps/api/src/app.module.ts
git commit -m ":sparkles: api — lighthaus.* notification job types + ops recipients config"
```

---

### Task 16: Transactional render fns for lighthaus emails

**Files:**
- Create: `packages/transactional/src/render/lighthaus.tsx`

**Interfaces:**
- Produces: `renderIncidentOpenedEmail`, `renderIncidentResolvedEmail`, `renderDailyDigestEmail` — each `(props) => Promise<{ subject; html; text }>`, reusing the existing `NotificationEmail` component.

- [ ] **Step 1: Create `render/lighthaus.tsx`**

```tsx
import * as React from "react";
import NotificationEmail from "../emails/NotificationEmail.js";
import { renderHtml, renderText } from "./index.js";

async function render(node: React.ReactElement) {
  const [html, text] = await Promise.all([renderHtml(node), renderText(node)]);
  return { html, text };
}

export type IncidentOpenedEmailProps = {
  monitorName: string;
  group: string;
  status: string;
  detailLines: { label: string; value: string }[];
  ctaUrl: string;
};

export async function renderIncidentOpenedEmail(props: IncidentOpenedEmailProps) {
  const subject = `🔴 DOWN: ${props.monitorName}`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title={`${props.monitorName} is DOWN`}
      body={`Lighthaus detected ${props.monitorName} (${props.group}) failing health checks. Status: ${props.status}.`}
      context={[{ label: "Monitor", value: props.monitorName }, { label: "Group", value: props.group }, ...props.detailLines]}
      ctaText="View status board"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}

export type IncidentResolvedEmailProps = {
  monitorName: string;
  group: string;
  downtimeFormatted: string;
  ctaUrl: string;
};

export async function renderIncidentResolvedEmail(props: IncidentResolvedEmailProps) {
  const subject = `🟢 RECOVERED: ${props.monitorName}`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title={`${props.monitorName} has recovered`}
      body={`${props.monitorName} (${props.group}) is back up. Total downtime: ${props.downtimeFormatted}.`}
      context={[{ label: "Monitor", value: props.monitorName }, { label: "Downtime", value: props.downtimeFormatted }]}
      ctaText="View status board"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}

export type DailyDigestEmailProps = {
  date: string;
  rows: { monitorName: string; group: string; uptime24h: number; status: string }[];
  openIncidents: { monitorName: string; openedAt: string }[];
  ctaUrl: string;
};

export async function renderDailyDigestEmail(props: DailyDigestEmailProps) {
  const subject = `Lighthaus daily digest — ${props.date}`;
  const body =
    props.openIncidents.length === 0
      ? "All systems operational over the last 24 hours."
      : `${props.openIncidents.length} open incident(s) need attention.`;
  const { html, text } = await render(
    <NotificationEmail
      previewText={subject}
      title={`Daily status digest — ${props.date}`}
      body={body}
      context={props.rows.map((r) => ({ label: `${r.monitorName} (${r.group})`, value: `${r.uptime24h}% / ${r.status}` }))}
      ctaText="View status board"
      ctaUrl={props.ctaUrl}
    />,
  );
  return { subject, html, text };
}
```

- [ ] **Step 2: Build transactional**

Run: `pnpm --filter @site-haus/transactional build`
Expected: emits `dist/render/lighthaus.js` + `.d.ts` (importable as `@site-haus/transactional/render/lighthaus`).

- [ ] **Step 3: Commit**

```bash
git add packages/transactional/src/render/lighthaus.tsx
git commit -m ":sparkles: transactional — lighthaus incident/recovery/digest email renders"
```

---

### Task 17: Processor branches → ops emails

**Files:**
- Modify: `apps/api/src/notifications/notifications.processor.ts`

**Interfaces:**
- Consumes: the new `NotificationJobData` members; `opsConfig.recipients`; the three render fns from Task 16.

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/notifications/notifications.processor.lighthaus.spec.ts`:
```ts
import { ConfigService } from '@nestjs/config';
import { NotificationsProcessor } from './notifications.processor';
import type { Job } from 'bullmq';
import type { NotificationJobData } from './notifications.types';

describe('NotificationsProcessor lighthaus branches', () => {
  it('sends incident_opened to ops recipients', async () => {
    const send = jest.fn().mockResolvedValue({ messageId: 'x' });
    const config = { get: (k: string) => (k === 'ops.recipients' ? ['ops@x.test'] : 'https://d.test') } as unknown as ConfigService;
    const proc = new NotificationsProcessor({} as never, { send } as never, config);
    const job = { data: { type: 'lighthaus.incident_opened', monitorId: 'm', monitorName: 'onehealth', group: 'client-site', status: 'down', detail: { code: 'SERVFAIL' }, openedAt: new Date().toISOString() } } as Job<NotificationJobData>;
    await proc.process(job);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].to).toEqual(['ops@x.test']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test notifications.processor.lighthaus.spec.ts`
Expected: FAIL — no handler; `send` not called.

- [ ] **Step 3: Add imports, ops recipients, switch cases, and handlers**

In `notifications.processor.ts`:

Add to imports:
```ts
import {
  renderIncidentOpenedEmail,
  renderIncidentResolvedEmail,
  renderDailyDigestEmail,
} from '@site-haus/transactional/render/lighthaus';
```

Add a private field set in the constructor:
```ts
  private readonly opsRecipients: string[];
  // in constructor body:
  this.opsRecipients = config.get<string[]>('ops.recipients') ?? [];
```

Add cases in the `switch (job.data.type)`:
```ts
      case 'lighthaus.incident_opened':
        await this.handleIncidentOpened(job.data);
        break;
      case 'lighthaus.incident_resolved':
        await this.handleIncidentResolved(job.data);
        break;
      case 'lighthaus.daily_digest':
        await this.handleDailyDigest(job.data);
        break;
```

Add the handler methods:
```ts
  private async handleIncidentOpened(
    data: Extract<NotificationJobData, { type: 'lighthaus.incident_opened' }>,
  ) {
    if (this.opsRecipients.length === 0) return;
    const detailLines = Object.entries(data.detail).map(([label, value]) => ({ label, value: String(value) }));
    const { subject, html, text } = await renderIncidentOpenedEmail({
      monitorName: data.monitorName, group: data.group, status: data.status,
      detailLines, ctaUrl: `${this.dashboardUrl}/status`,
    });
    await this.email.send({ to: this.opsRecipients, subject, html, text, tags: { type: data.type } });
  }

  private async handleIncidentResolved(
    data: Extract<NotificationJobData, { type: 'lighthaus.incident_resolved' }>,
  ) {
    if (this.opsRecipients.length === 0) return;
    const mins = Math.round(data.downtimeMs / 60_000);
    const { subject, html, text } = await renderIncidentResolvedEmail({
      monitorName: data.monitorName, group: data.group,
      downtimeFormatted: `${mins} min`, ctaUrl: `${this.dashboardUrl}/status`,
    });
    await this.email.send({ to: this.opsRecipients, subject, html, text, tags: { type: data.type } });
  }

  private async handleDailyDigest(
    data: Extract<NotificationJobData, { type: 'lighthaus.daily_digest' }>,
  ) {
    if (this.opsRecipients.length === 0) return;
    const { subject, html, text } = await renderDailyDigestEmail({
      date: data.date, rows: data.summary, openIncidents: data.openIncidents,
      ctaUrl: `${this.dashboardUrl}/status`,
    });
    await this.email.send({ to: this.opsRecipients, subject, html, text, tags: { type: data.type } });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test notifications.processor.lighthaus.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/notifications/notifications.processor.ts apps/api/src/notifications/notifications.processor.lighthaus.spec.ts
git commit -m ":sparkles: api — processor branches route lighthaus.* to ops recipients"
```

---

### Task 18: Upgrade api `/health` payload

**Files:**
- Modify: `apps/api/src/health/health.controller.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/health/health.controller.spec.ts`:
```ts
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns status, uptime, version', () => {
    const c = new HealthController({} as never);
    const r = c.checkApi();
    expect(r.status).toBe('ok');
    expect(typeof r.uptime).toBe('number');
    expect('version' in r).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter api test health.controller.spec.ts`
Expected: FAIL — `uptime`/`version` missing.

- [ ] **Step 3: Modify `checkApi()`**

```ts
  @Get()
  checkApi() {
    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      version: process.env.APP_VERSION ?? 'dev',
    };
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter api test health.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/health/health.controller.ts apps/api/src/health/health.controller.spec.ts
git commit -m ":sparkles: api — /health returns status+uptime+version"
```

---

## Phase 5 — `/api/health` across remaining apps

### Task 19: Health endpoints for the Next apps

**Files:**
- Create: `apps/web/app/api/health/route.ts`
- Create: `apps/iam/app/api/health/route.ts`
- Create: `apps/docs/...` health (see note)
- Create: `apps/commerce/app/api/health/route.ts`
- Create: `apps/dashboard/app/api/health/route.ts`

**Interfaces:**
- Produces: `GET /api/health` → `200 { status, uptime, version }` per app.

- [ ] **Step 1: Create the shared route body** (identical per app; repeated in full because each app is independent)

For each of `web`, `iam`, `commerce`, `dashboard`, create `app/api/health/route.ts`:
```ts
const startedAt = Date.now();

export function GET() {
  return Response.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    version: process.env.APP_VERSION ?? "dev",
  });
}
```

- [ ] **Step 2: Docs app** — `apps/docs` is Astro Starlight, not Next App Router. Create `apps/docs/public/health.json` containing `{"status":"ok"}` as a static fallback, **or** an Astro endpoint `apps/docs/src/pages/api/health.json.ts`:
```ts
import type { APIRoute } from "astro";
export const GET: APIRoute = () => new Response(JSON.stringify({ status: "ok", version: process.env.APP_VERSION ?? "dev" }), { headers: { "content-type": "application/json" } });
```
(Confirm Astro `output` mode supports endpoints; if fully static, use the `public/health.json` fallback.)

- [ ] **Step 3: Smoke-test one app locally**

Run: `cd apps/dashboard && pnpm dev` then `curl -s localhost:3001/api/health`
Expected: `{"status":"ok","uptime":<n>,"version":"dev"}`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/health apps/iam/app/api/health apps/commerce/app/api/health apps/dashboard/app/api/health apps/docs
git commit -m ":sparkles: apps — /api/health endpoints (status+uptime+version)"
```

> commerce `gateway` and `payments` live in `sitehaus-commerce` (separate repo). Add equivalent NestJS `/health` controllers there as a follow-up tracked in spec §12; they are reached over HTTP by Lighthaus regardless.

---

## Phase 6 — Dashboard `/status` UI

### Task 20: Status data layer + page + components

**Files:**
- Create: `apps/dashboard/lib/status-data.ts`
- Create: `apps/dashboard/app/(dashboard)/status/page.tsx`
- Create: `apps/dashboard/app/(dashboard)/status/_components/status-board.tsx`
- Create: `apps/dashboard/app/(dashboard)/status/_components/group-card.tsx`
- Create: `apps/dashboard/app/(dashboard)/status/_components/monitor-row.tsx`
- Create: `apps/dashboard/app/(dashboard)/status/_components/uptime-bar.tsx`
- Create: `apps/dashboard/app/(dashboard)/status/_components/incident-timeline.tsx`

**Interfaces:**
- Consumes: `@site-haus/db` (`schema`, `createDb`/shared `db`), `use-is-employee` gate.
- Produces: `getStatusBoard(): Promise<StatusGroup[]>` server fn; `StatusGroup = { group: string; monitors: StatusMonitor[] }`; `StatusMonitor = { id; name; type; lastStatus; lastLatencyMs; lastCheckedAt; uptime90d; openIncidentSince }`.

- [ ] **Step 1: Implement `lib/status-data.ts`** (server-only DB read; mirror how dashboard already constructs `db` — reuse the existing dashboard db helper if present, else `createDb`)

```ts
import "server-only";
import { and, desc, eq, gte, isNull, schema, type Db } from "@site-haus/db";
import { Pool } from "pg";
import { createDb } from "@site-haus/db";

const db: Db = createDb(new Pool({ connectionString: process.env.DATABASE_URL! }));

export interface StatusMonitor {
  id: string;
  name: string;
  type: string;
  group: string;
  lastStatus: string;
  lastLatencyMs: number | null;
  lastCheckedAt: string | null;
  uptime90d: number;
  openIncidentSince: string | null;
}

export interface StatusGroup {
  group: string;
  monitors: StatusMonitor[];
}

export async function getStatusBoard(): Promise<StatusGroup[]> {
  const monitors = await db.query.monitorsTable.findMany({ where: eq(schema.monitorsTable.enabled, true) });
  const since90 = new Date(Date.now() - 90 * 86_400_000);

  const built: StatusMonitor[] = await Promise.all(
    monitors.map(async (m) => {
      const last = await db.query.checkResultsTable.findFirst({
        where: eq(schema.checkResultsTable.monitorId, m.id),
        orderBy: desc(schema.checkResultsTable.checkedAt),
      });
      const window = await db.query.checkResultsTable.findMany({
        where: and(eq(schema.checkResultsTable.monitorId, m.id), gte(schema.checkResultsTable.checkedAt, since90)),
        columns: { status: true },
      });
      const open = await db.query.incidentsTable.findFirst({
        where: and(eq(schema.incidentsTable.monitorId, m.id), isNull(schema.incidentsTable.resolvedAt)),
      });
      const upish = window.filter((r) => r.status !== "down").length;
      return {
        id: m.id, name: m.name, type: m.type, group: m.group,
        lastStatus: last?.status ?? "unknown",
        lastLatencyMs: last?.latencyMs ?? null,
        lastCheckedAt: last?.checkedAt?.toISOString() ?? null,
        uptime90d: window.length === 0 ? 100 : Math.round((upish / window.length) * 100),
        openIncidentSince: open?.openedAt.toISOString() ?? null,
      };
    }),
  );

  const groups = new Map<string, StatusMonitor[]>();
  for (const m of built) groups.set(m.group, [...(groups.get(m.group) ?? []), m]);
  return [...groups.entries()].map(([group, mons]) => ({ group, monitors: mons }));
}
```

- [ ] **Step 2: Implement `page.tsx`** (thin; employee gate; server component fetch)

```tsx
import { getStatusBoard } from "@/lib/status-data";
import { StatusBoard } from "./_components/status-board";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const groups = await getStatusBoard();
  return <StatusBoard groups={groups} />;
}
```

> Employee gating: this route sits in the `(dashboard)` group, already auth-gated. Add the employee check the way other employee-only dashboard pages do (the `use-is-employee` hook for client components, or the server equivalent used elsewhere). If the dashboard has a server-side role check util, call it here and `notFound()` for non-employees.

- [ ] **Step 3: Implement `_components/status-board.tsx`**

```tsx
import { GroupCard } from "./group-card";
import type { StatusGroup } from "@/lib/status-data";

const GROUP_LABELS: Record<string, string> = {
  "client-site": "Client Sites",
  "sh-service": "SiteHaus Services",
  "commerce-service": "Commerce Services",
};

export function StatusBoard({ groups }: { groups: StatusGroup[] }) {
  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-semibold">System Status</h1>
      {groups.map((g) => (
        <GroupCard key={g.group} label={GROUP_LABELS[g.group] ?? g.group} monitors={g.monitors} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement `_components/group-card.tsx`, `monitor-row.tsx`, `uptime-bar.tsx`, `incident-timeline.tsx`**

`group-card.tsx`:
```tsx
import { MonitorRow } from "./monitor-row";
import type { StatusMonitor } from "@/lib/status-data";

export function GroupCard({ label, monitors }: { label: string; monitors: StatusMonitor[] }) {
  return (
    <section className="rounded-lg border">
      <header className="border-b px-4 py-3 font-medium">{label}</header>
      <ul className="divide-y">
        {monitors.map((m) => (
          <MonitorRow key={m.id} monitor={m} />
        ))}
      </ul>
    </section>
  );
}
```

`monitor-row.tsx`:
```tsx
import { UptimeBar } from "./uptime-bar";
import type { StatusMonitor } from "@/lib/status-data";

const DOT: Record<string, string> = { up: "bg-green-500", degraded: "bg-amber-500", down: "bg-red-500", unknown: "bg-gray-300" };

export function MonitorRow({ monitor }: { monitor: StatusMonitor }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${DOT[monitor.lastStatus] ?? DOT.unknown}`} />
        <div>
          <div className="font-medium">{monitor.name}</div>
          <div className="text-xs text-muted-foreground">
            {monitor.type}
            {monitor.lastLatencyMs != null ? ` · ${monitor.lastLatencyMs}ms` : ""}
            {monitor.lastCheckedAt ? ` · ${new Date(monitor.lastCheckedAt).toLocaleString()}` : " · never"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <UptimeBar pct={monitor.uptime90d} />
        {monitor.openIncidentSince && <span className="text-xs text-red-600">down since {new Date(monitor.openIncidentSince).toLocaleString()}</span>}
      </div>
    </li>
  );
}
```

`uptime-bar.tsx`:
```tsx
export function UptimeBar({ pct }: { pct: number }) {
  const color = pct >= 99 ? "bg-green-500" : pct >= 95 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded bg-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
```

`incident-timeline.tsx` (used when a monitor is expanded; minimal v1 renders open incident line):
```tsx
export function IncidentTimeline({ openedAt }: { openedAt: string | null }) {
  if (!openedAt) return null;
  return <p className="text-xs text-red-600">Open incident since {new Date(openedAt).toLocaleString()}</p>;
}
```

- [ ] **Step 5: Verify build + lint**

Run: `pnpm --filter dashboard build`
Expected: `/status` route compiles. Fix import-alias (`@/`) to match dashboard's tsconfig `paths` if it differs.

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/lib/status-data.ts "apps/dashboard/app/(dashboard)/status"
git commit -m ":sparkles: dashboard — /status board (groups, rows, uptime, incidents)"
```

> Add a nav entry to `/status` in the dashboard's employee navigation, following the existing nav pattern (audit-logs is an employee-only precedent). Include it in this commit if the nav is a simple array edit.

---

## Phase 7 — Docker + compose + deploy wiring

### Task 21: Lighthaus Dockerfile

**Files:**
- Create: `apps/lighthaus/Dockerfile`

- [ ] **Step 1: Create `Dockerfile`** (mirror `apps/api/Dockerfile`, swap filter to `lighthaus`)

```dockerfile
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache libc6-compat && \
    corepack enable && \
    corepack prepare pnpm@10.14.0 --activate && \
    pnpm add -g turbo@^2

FROM base AS prune
WORKDIR /app
COPY . .
RUN --mount=type=cache,target=/root/.cache/turbo turbo prune lighthaus --docker

FROM base AS installer
WORKDIR /app
COPY --from=prune /app/out/json/ .
COPY --from=prune /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=prune /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN --mount=type=cache,target=/pnpm/store pnpm fetch
COPY --from=prune /app/out/full/ ./
COPY turbo.json turbo.json
RUN --mount=type=cache,target=/pnpm/store pnpm install -r

FROM base AS build
WORKDIR /app
COPY --from=installer /app ./
RUN --mount=type=cache,target=/root/.cache/turbo turbo run build --filter=lighthaus...
RUN --mount=type=cache,target=/pnpm/store pnpm --filter=lighthaus deploy --prod --legacy /app/deploy

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/deploy ./
COPY --from=build /app/apps/lighthaus/dist ./dist
EXPOSE 3006
CMD ["node", "dist/main.js"]
```

- [ ] **Step 2: Build the image locally to validate**

Run: `docker build -f apps/lighthaus/Dockerfile -t lighthaus:test .`
Expected: image builds; final stage has `dist/main.js`.

- [ ] **Step 3: Commit**

```bash
git add apps/lighthaus/Dockerfile
git commit -m ":whale: lighthaus — production Dockerfile"
```

---

### Task 22: Compose service + env wiring + migrate-on-deploy

**Files:**
- Modify: `docker-compose.prod.yml`
- Modify: `.env.example` (document new vars)

- [ ] **Step 1: Add the `lighthaus` service** to `docker-compose.prod.yml` (on `sitehaus-network`, depends on postgres + redis):

```yaml
  lighthaus:
    image: ghcr.io/sitehaus/sitehaus-lighthaus:latest
    restart: always
    env_file:
      - ./apps/lighthaus/.env
    networks:
      - sitehaus-network
    ports:
      - "3006:3006"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

- [ ] **Step 2: Document env vars** in `.env.example` and create `apps/lighthaus/.env.example`:

```
DATABASE_URL=postgres://...           # same Postgres as the api
REDIS_URL=redis://redis:6379          # same Redis as the api notifications queue
RESEND_API_KEY=re_...
EMAIL_FROM=Lighthaus <alerts@sitehaus.co>
OPS_RECIPIENTS=ops@sitehaus.co,parker@sitehaus.co
HEALTHCHECKS_URL=https://hc-ping.com/<uuid>
DASHBOARD_URL=https://dashboard.sitehaus.co
LIGHTHAUS_PORT=3006
APP_VERSION=dev
```

Also add `OPS_RECIPIENTS` to `apps/api/.env.example`.

- [ ] **Step 3: Migration on deploy** — ensure the deploy runs `pnpm --filter @site-haus/db db:migrate` (or the existing migrate step) so the `monitors`/`check_results`/`incidents` tables exist before lighthaus boots. Add to the deploy script / CD workflow where db migration already happens (check `.github/workflows/cd.yml`).

- [ ] **Step 4: Commit**

```bash
git add docker-compose.prod.yml .env.example apps/lighthaus/.env.example apps/api/.env.example
git commit -m ":whale: lighthaus — compose service + env wiring"
```

- [ ] **Step 5: Commerce worker heartbeat (cross-repo follow-up)** — in `sitehaus-commerce/apps/worker`, add a repeatable job (or interval) that POSTs `{ service: "commerce-worker" }` to the Lighthaus heartbeat URL (`http://<vps>:3006/heartbeat` or a Caddy route). Tracked as a separate PR in the commerce repo; the ingest endpoint is ready from Task 14.

---

## Phase 8 — Final verification

### Task 23: Full suite + integration smoke

- [ ] **Step 1: Run all affected test suites**

Run:
```bash
pnpm --filter @site-haus/monitoring test
pnpm --filter lighthaus test
pnpm --filter api test
```
Expected: all PASS.

- [ ] **Step 2: Type-check + build the workspace**

Run: `pnpm check-types && pnpm build --filter=lighthaus --filter=api --filter=dashboard --filter=@site-haus/db --filter=@site-haus/monitoring --filter=@site-haus/transactional`
Expected: clean.

- [ ] **Step 3: Local end-to-end smoke** (against a dev DB + Redis)

- Apply migration: `cd packages/db && pnpm db:migrate`.
- Start `lighthaus` (`pnpm --filter lighthaus dev`); confirm logs show config sync + a fast cycle.
- `curl -s localhost:3006/health` → `{status, uptime, version}`.
- `curl -s -XPOST localhost:3006/heartbeat -H 'content-type: application/json' -d '{"service":"commerce-worker"}'` → `{ok:true}`; confirm a `check_results` row.
- Visit dashboard `/status` → board renders the seeded monitors.

- [ ] **Step 4: Commit any fixes, then open PR**

```bash
git push -u origin feat/lighthaus
gh pr create --base main --title "Lighthaus monitoring & status system" --body "Implements docs/superpowers/specs/2026-06-26-lighthaus-monitoring-design.md"
```

---

## Self-Review

**Spec coverage:**
- Pure core checks (HTTP/DNS/SSL/domain/email-DNS/service-health/heartbeat) → Tasks 2–7. ✅
- Incident state machine → Task 8. ✅
- DB tables `monitors`/`check_results`/`incidents` + migration → Task 9. ✅
- Scheduler/dispatcher + `monitors.config.ts` + persistence → Tasks 10–13. ✅
- `lighthaus.*` job types + processor branch + ops recipients + Redis enqueue + Resend failsafe → Tasks 12, 15, 17. ✅
- healthchecks.io dead-man's-switch + worker heartbeat ingest → Tasks 13, 14, 22. ✅
- `/api/health` endpoints across apps → Tasks 18, 19. ✅
- Dashboard `/status` UI → Task 20. ✅
- Dockerfile + compose + env → Tasks 21, 22. ✅
- TDD, SERVFAIL+REFUSED case, expired/near-expiry cert, blip/open/resolve, Redis-down failsafe → Tasks 3, 4, 8, 12. ✅

**Type consistency:** `LighthausJob` (Task 12) and the `NotificationJobData` additions (Task 15) are defined with identical property names/types; processor handlers (Task 17) and render fns (Task 16) consume those exact fields. `CheckResult` (core) vs `CheckResultRow` (db) are deliberately distinct names to avoid collision.

**Open items carried to deploy (spec §12):** production hostnames in `monitors.config.ts`, ops recipient list, `HEALTHCHECKS_URL`, DKIM selectors, commerce `gateway`/`payments` health controllers + worker heartbeat POST (cross-repo).
