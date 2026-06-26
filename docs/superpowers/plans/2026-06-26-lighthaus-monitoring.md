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
    const boom = async () => {
      throw new Error("ECONNREFUSED");
    };
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
  resolve4: async () => {
    const e: NodeJS.ErrnoException = new Error(code);
    e.code = code;
    throw e;
  },
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

export async function checkDns(
  host: string,
  resolver: DnsResolver = defaultResolver,
): Promise<CheckResult> {
  try {
    const addresses = await resolver.resolve4(host);
    if (!addresses || addresses.length === 0) {
      return { status: "down", detail: { reason: "no-answer" } };
    }
    return { status: "up", detail: { addresses } };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
    // SERVFAIL / REFUSED / ENOTFOUND / ENODATA all mean the name does not usably resolve.
    return {
      status: "down",
      detail: { code, message: err instanceof Error ? err.message : String(err) },
    };
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
    const r = await checkSsl("x.test", {
      now: () => now,
      probe: async () => ({ validTo: inDays(90), valid: true }),
    });
    expect(r.status).toBe("up");
    expect(r.detail.daysLeft).toBe(90);
  });

  it("degraded when valid but < warnDays (14) away", async () => {
    const r = await checkSsl("x.test", {
      warnDays: 14,
      now: () => now,
      probe: async () => ({ validTo: inDays(10), valid: true }),
    });
    expect(r.status).toBe("degraded");
    expect(r.detail.daysLeft).toBe(10);
  });

  it("down when expired", async () => {
    const r = await checkSsl("x.test", {
      now: () => now,
      probe: async () => ({ validTo: inDays(-1), valid: true }),
    });
    expect(r.status).toBe("down");
  });

  it("down when probe reports invalid", async () => {
    const r = await checkSsl("x.test", {
      now: () => now,
      probe: async () => ({ validTo: inDays(90), valid: false }),
    });
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
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("tls-timeout"));
    });
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
    const r = await checkDomainExpiry("x.test", {
      now: () => now,
      fetchRdap: async () => ({ expiration: inDays(200) }),
    });
    expect(r.status).toBe("up");
  });

  it("degraded when < warnDays (30)", async () => {
    const r = await checkDomainExpiry("x.test", {
      warnDays: 30,
      now: () => now,
      fetchRdap: async () => ({ expiration: inDays(20) }),
    });
    expect(r.status).toBe("degraded");
    expect(r.detail.daysLeft).toBe(20);
  });

  it("down when already expired", async () => {
    const r = await checkDomainExpiry("x.test", {
      now: () => now,
      fetchRdap: async () => ({ expiration: inDays(-2) }),
    });
    expect(r.status).toBe("down");
  });

  it("degraded when RDAP has no expiration data", async () => {
    const r = await checkDomainExpiry("x.test", {
      now: () => now,
      fetchRdap: async () => ({ expiration: null }),
    });
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

export async function checkDomainExpiry(
  domain: string,
  opts: DomainOptions = {},
): Promise<CheckResult> {
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
    return {
      status: "degraded",
      detail: { reason: "rdap-error", error: err instanceof Error ? err.message : String(err) },
    };
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
    name.startsWith("google._domainkey")
      ? [["v=DKIM1; k=rsa; p=ABC"]]
      : [["v=spf1 include:_spf.google.com ~all"]],
};

describe("checkEmailDns", () => {
  it("up when MX + SPF + DKIM all present", async () => {
    const r = await checkEmailDns("x.test", { dkimSelector: "google", resolver: healthy });
    expect(r.status).toBe("up");
  });

  it("down when MX missing", async () => {
    const r = await checkEmailDns("x.test", {
      dkimSelector: "google",
      resolver: { ...healthy, resolveMx: async () => [] },
    });
    expect(r.status).toBe("down");
    expect(r.detail.mx).toBe(false);
  });

  it("degraded when SPF missing", async () => {
    const r = await checkEmailDns("x.test", {
      dkimSelector: "google",
      resolver: {
        ...healthy,
        resolveTxt: async (n: string) =>
          n.startsWith("google._domainkey") ? [["v=DKIM1; p=ABC"]] : [["unrelated"]],
      },
    });
    expect(r.status).toBe("degraded");
    expect(r.detail.spf).toBe(false);
  });

  it("degraded when DKIM missing", async () => {
    const r = await checkEmailDns("x.test", {
      dkimSelector: "google",
      resolver: {
        ...healthy,
        resolveTxt: async (n: string) =>
          n.startsWith("google._domainkey") ? [] : [["v=spf1 ~all"]],
      },
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
      fetchFn: async () => {
        throw new Error("ETIMEDOUT");
      },
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
```

`heartbeat.ts`:

```ts
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
- Create: `packages/db/src/monitoring/monitors.relations.ts`
- Create: `packages/db/src/monitoring/check-results.relations.ts`
- Create: `packages/db/src/monitoring/incidents.relations.ts`
- Create: `packages/db/src/monitoring/index.ts`
- Modify: `packages/db/src/schema.ts`

**Interfaces:**

- Produces: `monitorsTable` (incl. `clientId` nullable FK → `clientsTable`), `checkResultsTable`, `incidentsTable`; inferred types `Monitor`, `NewMonitor`, `CheckResultRow`, `NewCheckResult`, `Incident`, `NewIncident`.

- [ ] **Step 1: `monitors.ts`** — note the `clientId` column (Revision v2 per-tenant scoping):

```ts
import { boolean, index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { clientsTable } from "../iam/clients.js";

export const monitorsTable = pgTable(
  "monitors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    target: varchar("target", { length: 256 }).notNull(),
    group: varchar("group", { length: 32 }).notNull(),
    // Revision v2: null = staff-only (service/infra); set = client-site, scoped to a tenant
    clientId: uuid("client_id").references(() => clientsTable.id, { onDelete: "cascade" }),
    thresholds: jsonb("thresholds"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("monitors_group_idx").on(t.group),
    index("monitors_client_idx").on(t.clientId),
    index("monitors_enabled_idx").on(t.enabled),
  ],
);

export type Monitor = typeof monitorsTable.$inferSelect;
export type NewMonitor = typeof monitorsTable.$inferInsert;
```

> Confirm `../iam/clients.js` exports `clientsTable` (it does — used across the iam domain). Use that exact import.

- [ ] **Step 2: `check-results.ts`**

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

> `CheckResultRow` (not `CheckResult`) avoids colliding with the core `CheckResult` shape.

- [ ] **Step 3: `incidents.ts`**

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
  (t) => [
    index("incidents_monitor_idx").on(t.monitorId),
    index("incidents_open_idx").on(t.resolvedAt),
  ],
);

export type Incident = typeof incidentsTable.$inferSelect;
export type NewIncident = typeof incidentsTable.$inferInsert;
```

- [ ] **Step 4: relations files**

`monitors.relations.ts`:

```ts
import { relations } from "drizzle-orm";
import { clientsTable } from "../iam/clients.js";
import { monitorsTable } from "./monitors.js";
import { checkResultsTable } from "./check-results.js";
import { incidentsTable } from "./incidents.js";

export const monitorsRelations = relations(monitorsTable, ({ one, many }) => ({
  client: one(clientsTable, { fields: [monitorsTable.clientId], references: [clientsTable.id] }),
  results: many(checkResultsTable),
  incidents: many(incidentsTable),
}));
```

`check-results.relations.ts`:

```ts
import { relations } from "drizzle-orm";
import { checkResultsTable } from "./check-results.js";
import { monitorsTable } from "./monitors.js";

export const checkResultsRelations = relations(checkResultsTable, ({ one }) => ({
  monitor: one(monitorsTable, {
    fields: [checkResultsTable.monitorId],
    references: [monitorsTable.id],
  }),
}));
```

`incidents.relations.ts`:

```ts
import { relations } from "drizzle-orm";
import { incidentsTable } from "./incidents.js";
import { monitorsTable } from "./monitors.js";

export const incidentsRelations = relations(incidentsTable, ({ one }) => ({
  monitor: one(monitorsTable, {
    fields: [incidentsTable.monitorId],
    references: [monitorsTable.id],
  }),
}));
```

- [ ] **Step 5: `monitoring/index.ts`**

```ts
export * from "./monitors.js";
export * from "./monitors.relations.js";
export * from "./check-results.js";
export * from "./check-results.relations.js";
export * from "./incidents.js";
export * from "./incidents.relations.js";
```

- [ ] **Step 6: merge into `schema.ts`** — add the monitoring namespace alongside iam/core:

```ts
export * from "./core/index.js";
export * from "./iam/index.js";
export * from "./monitoring/index.js";
// ...
import * as monitoring from "./monitoring/index.js";
// ...
export const schema = { ...iam, ...core, ...monitoring } as const;
```

- [ ] **Step 7: build + generate + inspect migration**

```bash
pnpm --filter @site-haus/db build
cd packages/db && pnpm db:gen
```

Read the generated SQL: confirm `monitors.client_id` FK → `clients(id)` ON DELETE CASCADE, the three tables, and the composite `check_results (monitor_id, checked_at)` index.

- [ ] **Step 8: commit**

```bash
git add packages/db/src/monitoring packages/db/src/schema.ts packages/db/migrations
git commit -m ":card_file_box: lighthaus — monitors(+client_id)/check_results/incidents tables + migration"
```

> Migration is applied via `pnpm db:migrate` at deploy (Task 26), not here.

---

## Phase 3 — `apps/lighthaus-api` (collector + auth + scoped read API + snapshot)

### Task 10: Scaffold `apps/lighthaus-api` Nest app + config + db module

**Files:**

- Create: `apps/lighthaus-api/package.json`, `tsconfig.json`, `tsconfig.build.json`, `nest-cli.json`, `eslint.config.mjs`
- Create: `apps/lighthaus-api/src/main.ts`, `app.module.ts`
- Create: `apps/lighthaus-api/src/config/lighthaus.config.ts`
- Create: `apps/lighthaus-api/src/db/tokens.ts`, `src/db/db.module.ts`

**Interfaces:**

- Produces: `LIGHTHAUS_DB` token → `Db`; `lighthaus` config namespace `{ databaseUrl, redisUrl, resendApiKey, emailFrom, opsRecipients: string[], healthchecksUrl, lighthausUrl, port, jwtSecret, r2: { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl } }`.

- [ ] **Step 1: `package.json`** (app name `lighthaus-api`; mirrors commerce `worker` + the deps below):

```json
{
  "name": "lighthaus-api",
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
    "@aws-sdk/client-s3": "^3.700.0",
    "@nestjs/bullmq": "^11.0.4",
    "@nestjs/common": "^11.1.6",
    "@nestjs/config": "^4.0.0",
    "@nestjs/core": "^11.1.6",
    "@nestjs/jwt": "^11.0.0",
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

- [ ] **Step 2: `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.mjs`** — copy from `apps/api` verbatim (`nest-cli.json` with `"sourceRoot": "src"`; `tsconfig.json` the CommonJS Nest config with decorators; `tsconfig.build.json` excluding specs; `eslint.config.mjs` the nest config).

- [ ] **Step 3: `config/lighthaus.config.ts`**

```ts
import { registerAs } from "@nestjs/config";

export default registerAs("lighthaus", () => ({
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? "redis://redis:6379",
  resendApiKey: process.env.RESEND_API_KEY!,
  emailFrom: process.env.EMAIL_FROM ?? "Lighthaus <alerts@sitehaus.co>",
  opsRecipients: (process.env.OPS_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  healthchecksUrl: process.env.HEALTHCHECKS_URL ?? "",
  lighthausUrl: process.env.LIGHTHAUS_URL ?? "https://status.sitehaus.co",
  port: Number(process.env.LIGHTHAUS_PORT ?? 3007),
  // Same secret apps/api signs IAM access tokens with — lets us validate them here.
  jwtSecret: process.env.JWT_SECRET ?? process.env.JWT_SECRET_B64URL ?? "",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.R2_STATUS_BUCKET ?? "lighthaus-status",
    publicBaseUrl: process.env.R2_STATUS_PUBLIC_URL ?? "",
  },
}));
```

> Confirm how `apps/api` reads the JWT secret (`apps/api/src/conf/*` / auth module) and mirror the exact env var + encoding so tokens validate identically. Adjust `jwtSecret` here to match.

- [ ] **Step 4: `db/tokens.ts` + `db/db.module.ts`** — identical pattern to the collector DB wiring:

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
      useFactory: (config: ConfigService) =>
        createDb(new Pool({ connectionString: config.get<string>("lighthaus.databaseUrl") })),
    },
  ],
  exports: [LIGHTHAUS_DB],
})
export class DbModule {}
```

- [ ] **Step 5: `app.module.ts` + `main.ts`**

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
  app.enableCors({
    origin: [process.env.LIGHTHAUS_UI_ORIGIN ?? "https://status.sitehaus.co"],
    credentials: true,
  });
  const config = app.get(ConfigService);
  await app.listen(config.get<number>("lighthaus.port")!);
  Logger.log(`lighthaus-api listening on :${config.get<number>("lighthaus.port")}`, "Bootstrap");
}
bootstrap();
```

- [ ] **Step 6: install + build**

```bash
pnpm install && pnpm --filter lighthaus-api build
```

Expected: `apps/lighthaus-api/dist/main.js` exists.

- [ ] **Step 7: commit**

```bash
git add apps/lighthaus-api pnpm-lock.yaml
git commit -m ":sparkles: lighthaus-api — scaffold NestJS app shell + config + db module"
```

---

### Task 11: `monitors.config.ts` + `MonitorRepository` (sync, results, incidents, uptime, heartbeat, scoped reads)

**Files:**

- Create: `apps/lighthaus-api/src/monitors.config.ts`
- Create: `apps/lighthaus-api/src/persistence/monitor.repository.ts`
- Test: `apps/lighthaus-api/src/persistence/monitor.repository.spec.ts`

**Interfaces:**

- Consumes: `LIGHTHAUS_DB`, `schema` (monitors/check_results/incidents, `userRolesTable`), `MonitorType` from `@site-haus/monitoring`.
- Produces: `MonitorConfig` (+ optional `clientId`); `monitors: MonitorConfig[]`; `computeUptimePct(rows)`; `MonitorRepository` with `syncFromConfig`, `listEnabled`, `recordResult`, `recordHeartbeat`, `getOpenIncident`, `openIncident`, `resolveIncident`, `getLastHeartbeat`, `uptime`, and **scoped reads** `clientIdsForUser(userId)` + `listForViewer({ isStaff, clientIds })`.

- [ ] **Step 1: `monitors.config.ts`** (note optional `clientId` per group):

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
  clientId?: string; // Revision v2: set for client-site monitors → tenant scoping
  checks: MonitorCheck[];
}

export const monitors: MonitorConfig[] = [
  {
    name: "onehealthclinics.com",
    group: "client-site",
    clientId: process.env.ONEHEALTH_CLIENT_ID, // confirm real client id at deploy (§ spec open items)
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
    checks: [
      { type: "heartbeat", target: "commerce-worker", thresholds: { maxSilenceMs: 180000 } },
    ],
  },
];
```

- [ ] **Step 2: failing test** for `computeUptimePct` + a scoped-filter helper:

```ts
import { computeUptimePct, filterByViewer } from "./monitor.repository.js";

describe("computeUptimePct", () => {
  it("100% all up", () => expect(computeUptimePct([{ status: "up" }, { status: "up" }])).toBe(100));
  it("50% half down", () =>
    expect(computeUptimePct([{ status: "up" }, { status: "down" }])).toBe(50));
  it("degraded counts as available", () =>
    expect(computeUptimePct([{ status: "degraded" }])).toBe(100));
  it("100% when empty", () => expect(computeUptimePct([])).toBe(100));
});

describe("filterByViewer", () => {
  const mons = [
    { id: "a", clientId: null },
    { id: "b", clientId: "c1" },
    { id: "c", clientId: "c2" },
  ];
  it("staff see all", () =>
    expect(filterByViewer(mons, { isStaff: true, clientIds: [] }).map((m) => m.id)).toEqual([
      "a",
      "b",
      "c",
    ]));
  it("client sees only own (never null/staff-only)", () =>
    expect(filterByViewer(mons, { isStaff: false, clientIds: ["c1"] }).map((m) => m.id)).toEqual([
      "b",
    ]));
});
```

- [ ] **Step 3: run test → fails** (`pnpm --filter lighthaus-api test src/persistence/monitor.repository.spec.ts`).

- [ ] **Step 4: implement `monitor.repository.ts`**. Pure helpers first (exported for tests), then the injectable class. Key parts:

```ts
import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, inArray, isNull, schema, type Db } from "@site-haus/db";
import type { CheckResult } from "@site-haus/monitoring";
import { LIGHTHAUS_DB } from "../db/tokens.js";
import type { MonitorConfig } from "../monitors.config.js";

type Monitor = typeof schema.monitorsTable.$inferSelect;
type Incident = typeof schema.incidentsTable.$inferSelect;

export function computeUptimePct(rows: { status: string }[]): number {
  if (rows.length === 0) return 100;
  return Math.round((rows.filter((r) => r.status !== "down").length / rows.length) * 100);
}

export function filterByViewer<T extends { clientId: string | null }>(
  mons: T[],
  viewer: { isStaff: boolean; clientIds: string[] },
): T[] {
  if (viewer.isStaff) return mons;
  return mons.filter((m) => m.clientId !== null && viewer.clientIds.includes(m.clientId));
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
        const values = {
          group: cfg.group,
          clientId: cfg.clientId ?? null,
          thresholds: check.thresholds ?? null,
        };
        if (existing) {
          await this.db
            .update(schema.monitorsTable)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(schema.monitorsTable.id, existing.id));
        } else {
          await this.db
            .insert(schema.monitorsTable)
            .values({ name: cfg.name, type: check.type, target: check.target, ...values });
        }
      }
    }
  }

  listEnabled(): Promise<Monitor[]> {
    return this.db.query.monitorsTable.findMany({ where: eq(schema.monitorsTable.enabled, true) });
  }

  async recordResult(monitorId: string, result: CheckResult): Promise<void> {
    await this.db.insert(schema.checkResultsTable).values({
      monitorId,
      status: result.status,
      latencyMs: result.latencyMs ?? null,
      detail: result.detail,
    });
  }

  async recordHeartbeat(target: string): Promise<void> {
    const m = await this.db.query.monitorsTable.findFirst({
      where: and(
        eq(schema.monitorsTable.type, "heartbeat"),
        eq(schema.monitorsTable.target, target),
      ),
    });
    if (m) await this.recordResult(m.id, { status: "up", detail: { source: "heartbeat-ingest" } });
  }

  async getLastHeartbeat(target: string): Promise<Date | null> {
    const m = await this.db.query.monitorsTable.findFirst({
      where: and(
        eq(schema.monitorsTable.type, "heartbeat"),
        eq(schema.monitorsTable.target, target),
      ),
    });
    if (!m) return null;
    const last = await this.db.query.checkResultsTable.findFirst({
      where: and(
        eq(schema.checkResultsTable.monitorId, m.id),
        eq(schema.checkResultsTable.status, "up"),
      ),
      orderBy: desc(schema.checkResultsTable.checkedAt),
    });
    return last?.checkedAt ?? null;
  }

  async getOpenIncident(monitorId: string): Promise<Incident | null> {
    return (
      (await this.db.query.incidentsTable.findFirst({
        where: and(
          eq(schema.incidentsTable.monitorId, monitorId),
          isNull(schema.incidentsTable.resolvedAt),
        ),
      })) ?? null
    );
  }
  async openIncident(monitorId: string, lastStatus: string): Promise<Incident> {
    const [row] = await this.db
      .insert(schema.incidentsTable)
      .values({ monitorId, lastStatus, notifiedOpen: true })
      .returning();
    return row;
  }
  async resolveIncident(id: string): Promise<void> {
    await this.db
      .update(schema.incidentsTable)
      .set({ resolvedAt: new Date(), notifiedResolved: true, lastStatus: "up" })
      .where(eq(schema.incidentsTable.id, id));
  }

  async uptime(monitorId: string, sinceMs: number): Promise<number> {
    const since = new Date(Date.now() - sinceMs);
    const rows = await this.db.query.checkResultsTable.findMany({
      where: and(
        eq(schema.checkResultsTable.monitorId, monitorId),
        gte(schema.checkResultsTable.checkedAt, since),
      ),
      columns: { status: true },
    });
    return computeUptimePct(rows);
  }

  // ── Revision v2 scoped reads (consumed by the read API, Task 16) ──
  async clientIdsForUser(userId: string): Promise<string[]> {
    const rows = await this.db.query.userRolesTable.findMany({
      where: eq(schema.userRolesTable.userId, userId),
      columns: { clientId: true },
    });
    return [...new Set(rows.map((r) => r.clientId).filter((c): c is string => !!c))];
  }

  async listForViewer(viewer: { isStaff: boolean; clientIds: string[] }): Promise<Monitor[]> {
    const all = await this.listEnabled();
    return filterByViewer(all, viewer);
  }
}
```

> Confirm `userRolesTable` shape (`userId`, `clientId`) — it's the table `apps/api`'s notifications processor reads for client-user lookups. Match its column names exactly.

- [ ] **Step 5: run test → passes** (6 tests). **Step 6: commit**

```bash
git add apps/lighthaus-api/src/monitors.config.ts apps/lighthaus-api/src/persistence
git commit -m ":sparkles: lighthaus-api — monitors.config(+clientId) + MonitorRepository (incl. scoped reads)"
```

---

### Task 12: Dispatcher — enqueue `lighthaus.*` with Resend failsafe

**Files:**

- Create: `apps/lighthaus-api/src/dispatcher/queue.module.ts`, `dispatcher/dispatcher.service.ts`
- Test: `apps/lighthaus-api/src/dispatcher/dispatcher.service.spec.ts`

**Interfaces:**

- Produces: `LighthausJob` union (matches the `NotificationJobData` additions in Task 17 **exactly**); `DispatcherService.dispatch(job)` — `queue.add(job.type, job, {...})`; on throw → direct Resend send to `lighthaus.opsRecipients`.

This task is **unchanged from the original collector design** except the app path is `apps/lighthaus-api`. Implement:

- `LighthausJob` = the three-member union: `lighthaus.incident_opened { monitorId, monitorName, group, status, detail, openedAt }`, `lighthaus.incident_resolved { monitorId, monitorName, group, openedAt, resolvedAt, downtimeMs }`, `lighthaus.daily_digest { date, summary: {monitorName,group,uptime24h,status}[], openIncidents: {monitorName,openedAt}[] }`.
- `RESEND_CLIENT` symbol provider (`new Resend(config.get("lighthaus.resendApiKey"))`).
- `QueueModule` registers BullMQ root (connection `lighthaus.redisUrl`) + queue `"notifications"`, provides `DispatcherService` + `RESEND_CLIENT`.
- `dispatch()` wraps `queue.add(job.type, job, { attempts: 3, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: 100, removeOnFail: 200 })` in try/catch; catch → `failsafeSend` (Resend `emails.send` to opsRecipients with a plain-text subject+JSON body).

- [ ] **Step 1: failing test** — two cases, mirroring the original:
  1. Redis healthy: `add` mock called with `("lighthaus.incident_opened", job, {...})`, Resend `send` NOT called.
  2. Redis down (`add` rejects): Resend `send` called once with `to === lighthaus.opsRecipients`.
     Wire via `Test.createTestingModule` with `ConfigModule` providing `{ lighthaus: { opsRecipients: ["ops@x.test"], emailFrom: "a@x.test", lighthausUrl: "https://s.test" } }`, `getQueueToken("notifications")` → `{ add }`, `RESEND_CLIENT` → `{ emails: { send } }`.
- [ ] **Step 2: run → fails. Step 3: implement** `queue.module.ts` + `dispatcher.service.ts` per above. **Step 4: run → passes (2).**
- [ ] **Step 5: commit** `:sparkles: lighthaus-api — dispatcher (enqueue lighthaus.* + Resend failsafe)`

---

### Task 13: Scheduler — run due checks, drive incidents, dispatch, deadman, digest

**Files:**

- Create: `apps/lighthaus-api/src/scheduler/check-runner.ts`, `scheduler/scheduler.service.ts`, `deadman/deadman.service.ts`
- Test: `apps/lighthaus-api/src/scheduler/check-runner.spec.ts`
- Modify: `apps/lighthaus-api/src/app.module.ts` (register `QueueModule`, providers)

**Interfaces:**

- Produces: `runCheck(monitor, deps): Promise<CheckResult>` (pure dispatch by `monitor.type`; unknown type → down); `SchedulerService` (`@Interval(120_000)` fast cycle + deadman ping; `@Cron("0 6 * * *")` slow cycle; `@Cron("0 8 * * *")` digest; `onModuleInit` runs `syncFromConfig(monitors)`); `DeadmanService.ping()`.

Implement exactly as the collector design (unchanged except `apps/lighthaus-api` paths):

- `check-runner.ts`: `realDeps` bundles the seven core check fns; `runCheck` switches on `monitor.type` routing to `deps.checkHttp/checkDns/checkSsl(...,{warnDays})/checkDomainExpiry(...,{warnDays})/checkEmailDns(...,{dkimSelector})/checkServiceHealth`; `heartbeat` → `deps.evaluateHeartbeat(await deps.getLastHeartbeat(target), new Date(), maxSilenceMs)`; default → `{ status: "down", detail: { reason: "unknown-type", type } }`.
- `scheduler.service.ts`: holds an in-process `Map<monitorId, IncidentState>`; `runGroup(predicate)` iterates `repo.listEnabled()` filtered by type, runs the check, `repo.recordResult`, then `evaluateIncident` which calls `reduceIncident(prev, result)` and on `open`→`repo.openIncident`+`dispatcher.dispatch(incident_opened)`, on `resolve`→`repo.getOpenIncident`+`repo.resolveIncident`+`dispatcher.dispatch(incident_resolved)` (downtimeMs from openedAt). Fast cycle covers non-slow types + `deadman.ping()`; slow cycle covers `ssl|domain|email_dns`. `dailyDigest` builds `summary` from `repo.uptime(id, 24h)` + open incidents and dispatches `daily_digest`.
- `deadman.service.ts`: `ping()` GETs `lighthaus.healthchecksUrl` (no-op if empty; warn on failure).
- `email ctaUrl`/dispatch payloads reference the status UI via `lighthaus.lighthausUrl` (set in Task 17's processor, not here).

- [ ] **Step 1: failing test** for `runCheck`: routes `http`→checkHttp (up); `heartbeat`→getLastHeartbeat+evaluateHeartbeat (up); unknown type→down (`detail.reason==="unknown-type"`). Inject fakes via the `deps` param.
- [ ] **Step 2: run → fails. Step 3: implement check-runner. Step 4: run → passes (3).**
- [ ] **Step 5: implement deadman + scheduler; register in app.module.ts. Step 6: build.**
- [ ] **Step 7: commit** `:sparkles: lighthaus-api — scheduler (fast/slow cycles, incidents, digest, deadman)`

---

### Task 14: Heartbeat ingest + lighthaus-api self-health

**Files:**

- Create: `apps/lighthaus-api/src/heartbeat/heartbeat.controller.ts`, `health/health.controller.ts`
- Test: `apps/lighthaus-api/src/heartbeat/heartbeat.controller.spec.ts`
- Modify: `app.module.ts` (register controllers)

**Interfaces:**

- Produces: `POST /heartbeat { service: string }` → `repo.recordHeartbeat(service)` → `{ ok: true }`; `GET /health` → `{ status, uptime, version }`.

- [ ] **Step 1: failing test** — `HeartbeatController.ingest({ service: "commerce-worker" })` calls `repo.recordHeartbeat("commerce-worker")` and returns `{ ok: true }` (mock `MonitorRepository`).
- [ ] **Step 2: run → fails. Step 3: implement** both controllers (`recordHeartbeat` already exists on the repo from Task 11). `health.controller.ts` returns `{ status: "ok", uptime: Math.floor((Date.now()-startedAt)/1000), version: process.env.APP_VERSION ?? "dev" }`. Register both in `app.module.ts`. **Step 4: run → passes. Step 5: build.**
- [ ] **Step 6: commit** `:sparkles: lighthaus-api — heartbeat ingest + self-health endpoint`

---

### Task 15: R2 availability snapshot publisher

**Files:**

- Create: `apps/lighthaus-api/src/snapshot/snapshot.service.ts`
- Test: `apps/lighthaus-api/src/snapshot/snapshot.service.spec.ts`
- Modify: `apps/lighthaus-api/src/scheduler/scheduler.service.ts` (call publisher each fast cycle)

**Interfaces:**

- Consumes: `MonitorRepository`, `lighthaus.r2` config, an injected S3 client.
- Produces: `buildSnapshot(monitors, lastResults, openIncidents, now): StatusSnapshot` (pure); `SnapshotService.publish()` → uploads `status.json` to R2. `StatusSnapshot = { generatedAt: string; groups: { group: string; monitors: { name; type; status; lastCheckedAt; uptime24h }[] }[]; openIncidents: { monitorName; openedAt }[] }`.

> The snapshot is the **failure-domain-independent** view. It deliberately does **not** include per-client detail or client names beyond what a staff war-room needs; it is served behind Cloudflare Access (Task 24).

- [ ] **Step 1: failing test** for the pure `buildSnapshot`: groups monitors by `group`, maps each to `{ name, type, status, lastCheckedAt, uptime24h }`, and lists open incidents. Assert shape + grouping with a small fixture.
- [ ] **Step 2: run → fails. Step 3: implement** `buildSnapshot` (pure) + `SnapshotService` (injects an `@aws-sdk/client-s3` `S3Client` configured for R2 endpoint `https://<accountId>.r2.cloudflarestorage.com`; `publish()` gathers data via the repo, builds the snapshot, `PutObjectCommand` to `bucket/status.json` with `contentType: application/json`, short cache-control). Provide the `S3Client` via a `R2_CLIENT` symbol so the test injects a fake with a spied `send`.
- [ ] **Step 4: run → passes. Step 5:** call `await this.snapshot.publish()` at the end of `SchedulerService.fastCycle()` (after deadman ping), guarded by try/catch + logger.warn so a snapshot failure never breaks the cycle. Build.
- [ ] **Step 6: commit** `:sparkles: lighthaus-api — R2 availability snapshot publisher`

---

### Task 16: JWT `AccessGuard` + per-tenant scoped read API

**Files:**

- Create: `apps/lighthaus-api/src/auth/access.guard.ts`, `auth/current-user.decorator.ts`, `auth/auth.module.ts`
- Create: `apps/lighthaus-api/src/status/status.controller.ts`, `status/status.service.ts`
- Test: `apps/lighthaus-api/src/status/status.service.spec.ts`
- Modify: `app.module.ts`

**Interfaces:**

- Consumes: `lighthaus.jwtSecret`, `MonitorRepository` (scoped reads + per-monitor history/incidents).
- Produces: `AccessGuard` (validates IAM access token → `req.user = { id, isEmployee, ... }`); `GET /status` → viewer-scoped board; `GET /status/:monitorId` → history + incidents (403 if monitor not in viewer scope).

- [ ] **Step 1: study `apps/api`'s auth** — read `apps/api/src/auth/access.guard.ts` and how `req.user` is shaped (`isEmployee`/role flags, where the token comes from — cookie vs `Authorization` header). **Mirror it**: same JWT verification (same secret), same `req.user` shape. The status UI will send the IAM access token the same way dashboard does.
- [ ] **Step 2: failing test** for `StatusService.boardFor(user)`:
  - staff user → repo.listForViewer called with `{ isStaff: true }`; returns all groups.
  - client user → `clientIdsForUser` resolves their clients; `listForViewer({ isStaff: false, clientIds })`; only their monitors returned, grouped.
    Mock `MonitorRepository`. Assert grouping + scoping.
- [ ] **Step 3: run → fails. Step 4: implement**:
  - `access.guard.ts` + `current-user.decorator.ts` + `auth.module.ts` (JwtModule with `lighthaus.jwtSecret`) mirroring `apps/api`.
  - `status.service.ts`: `boardFor(user)` → derive `{ isStaff: user.isEmployee, clientIds: user.isEmployee ? [] : await repo.clientIdsForUser(user.id) }`, `repo.listForViewer(viewer)`, enrich each monitor with last result + `uptime(id, 90d)` + open incident, group by `group`. `monitorDetailFor(user, monitorId)` → verify the monitor is in the viewer's scoped set (else `null` → controller 403), return recent `check_results` + incidents.
  - `status.controller.ts`: `@UseGuards(AccessGuard)` on `GET /status` and `GET /status/:monitorId`, `@CurrentUser()` param.
  - register `AuthModule`, `StatusController`, `StatusService` in `app.module.ts`.
- [ ] **Step 5: run → passes. Step 6: build. Step 7: commit** `:sparkles: lighthaus-api — JWT guard + per-tenant scoped /status read API`

---

## Phase 4 — `api` integration (job types, transactional, processor, health)

### Task 17: Extend `NotificationJobData` + ops config

**Files:** Modify `apps/api/src/notifications/notifications.types.ts`; create `apps/api/src/notifications/ops.config.ts`; register `opsConfig` in the api config loader.

- [ ] Append the three `lighthaus.*` members to `NotificationJobData` (identical fields to `LighthausJob` in Task 12). Create `ops.config.ts` (`registerAs('ops', () => ({ recipients: (process.env.OPS_RECIPIENTS ?? '').split(',').map(s=>s.trim()).filter(Boolean) }))`). Add to `ConfigModule.forRoot({ load: [...] })`. `pnpm --filter api check-types`. Commit `:sparkles: api — lighthaus.* job types + ops recipients config`.

---

### Task 18: Transactional render fns for lighthaus emails

**Files:** Create `packages/transactional/src/render/lighthaus.tsx`.

- [ ] Implement `renderIncidentOpenedEmail`, `renderIncidentResolvedEmail`, `renderDailyDigestEmail` reusing the existing `NotificationEmail` component (title/body/context/cta), each returning `{ subject, html, text }`. `ctaUrl` → the status UI. Build transactional (emits `dist/render/lighthaus.js`). Commit `:sparkles: transactional — lighthaus incident/recovery/digest email renders`.

(Identical content to the original Task 16 — incident-opened/resolved/digest renders.)

---

### Task 19: Processor branches → ops emails

**Files:** Modify `apps/api/src/notifications/notifications.processor.ts`; test `notifications.processor.lighthaus.spec.ts`.

**Interfaces:** consumes the new job types, `ops.recipients`, the Task 18 renders, and a status-UI base URL.

- [ ] **Step 1: failing test** — construct `NotificationsProcessor` with a mock `EmailService.send` and a `ConfigService` returning `ops.recipients=['ops@x.test']` and the status URL; process a `lighthaus.incident_opened` job; assert `send` called once with `to=['ops@x.test']`.
- [ ] **Step 2: run → fails. Step 3: implement**: import the three renders; add `this.opsRecipients = config.get('ops.recipients') ?? []` and a status-UI base url (`config.get('lighthaus.url')` or reuse an env) in the constructor; add three `switch` cases + `handleIncidentOpened/Resolved/DailyDigest` that render and `email.send({ to: this.opsRecipients, ... , tags:{type} })`, returning early if `opsRecipients` empty. `ctaUrl` → `${statusUrl}` (the lighthaus UI; for incidents link to `/` or `/m/${monitorId}`). **Step 4: run → passes. Step 5: commit** `:sparkles: api — processor branches route lighthaus.* to ops recipients`.

---

### Task 20: Upgrade api `/health` payload

**Files:** Modify `apps/api/src/health/health.controller.ts`; test `health.controller.spec.ts`.

- [ ] TDD: `checkApi()` returns `{ status:'ok', uptime: Math.floor(process.uptime()), version: process.env.APP_VERSION ?? 'dev' }` (keep `/health/db`). Commit `:sparkles: api — /health returns status+uptime+version`.

---

## Phase 5 — `/api/health` across remaining apps

### Task 21: Health endpoints for the Next apps

**Files:** Create `app/api/health/route.ts` in `web`, `iam`, `commerce`, `dashboard`; Astro endpoint or `public/health.json` for `docs`.

- [ ] Each Next route:

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

- [ ] Docs (Astro): `src/pages/api/health.json.ts` endpoint or static `public/health.json`. Smoke-test one (`curl localhost:3001/api/health`). Commit `:sparkles: apps — /api/health endpoints`.
  > commerce `gateway`/`payments` (separate repo) get equivalent NestJS `/health` as a follow-up; Lighthaus reaches them over HTTP regardless.

---

## Phase 6 — `apps/lighthaus` status UI (Next.js, OAuth PKCE)

### Task 22: Scaffold `apps/lighthaus` Next app + OAuth PKCE auth

**Files:**

- Create: `apps/lighthaus/` Next.js App Router app (`package.json`, `next.config`, `tsconfig.json`, `app/layout.tsx`, `app/providers.tsx`, env).
- Create: auth wiring mirroring **dashboard/commerce** (`@site-haus/sdk` OAuth PKCE + `@site-haus/contracts`), login route + callback, and the access-token forwarding to `lighthaus-api`.

**Interfaces:** Produces a logged-in app shell where a server util / client hook can call `lighthaus-api`'s `/status` with the IAM access token. Mirrors the existing dashboard auth exactly.

- [ ] **Step 1: study dashboard auth** — read `apps/dashboard/app/login`, `app/callback`, `app/providers`, and how it obtains/stores the IAM access token and attaches it to API calls (cookies vs header). **Replicate that pattern** (same `@site-haus/sdk` client config, same OAuth PKCE redirect URIs, new client registration for `status.sitehaus.co`).
- [ ] **Step 2: scaffold** the Next app (copy dashboard's `package.json`/`next.config`/`tsconfig` shape; TanStack Query provider; Tailwind v4 + `@site-haus/ui`). Set `LIGHTHAUS_API_URL` env. Add an API client helper that points at `lighthaus-api` and forwards the access token.
- [ ] **Step 3: verify** `pnpm --filter lighthaus dev` boots, login redirects through IAM, callback lands authenticated. Commit `:sparkles: lighthaus — scaffold status UI app + OAuth PKCE auth`.

> No DB access from this app. All data via `lighthaus-api`. This is the only new piece with real integration nuance — if the auth pattern is unclear after reading dashboard, escalate rather than guess.

---

### Task 23: Status board UI (staff + client views)

**Files:**

- Create: `apps/lighthaus/app/page.tsx` (board), `app/_components/{status-board,group-card,monitor-row,uptime-bar,incident-timeline}.tsx`
- Create: `apps/lighthaus/lib/status-client.ts` (TanStack Query hooks calling `lighthaus-api`)
- Create: `apps/lighthaus/app/m/[monitorId]/page.tsx` (detail: history + incidents)

**Interfaces:** Consumes `lighthaus-api` `GET /status` and `GET /status/:monitorId`. The API already scopes by viewer, so the UI renders whatever it gets — **staff get all groups, clients get only their own monitors, with no client-side filtering needed.**

- [ ] **Step 1: `lib/status-client.ts`** — TanStack Query hooks (`useStatusBoard`, `useMonitorDetail`) hitting `LIGHTHAUS_API_URL` with the forwarded token; query keys centralized.
- [ ] **Step 2: components** (one per file, dashboard standards): `StatusBoard` → group cards; `MonitorRow` → green/amber/red dot + latency + last-checked; `UptimeBar` → 90-day %; `IncidentTimeline` on the detail page. Client-friendly copy (these screens may be seen by non-technical clients).
- [ ] **Step 3: detail page** `app/m/[monitorId]` → `useMonitorDetail` (handles 403 gracefully → not-found).
- [ ] **Step 4: build** `pnpm --filter lighthaus build`. Commit `:sparkles: lighthaus — status board (staff/client scoped views) + monitor detail`.

---

### Task 24: Availability snapshot page (Cloudflare, no SiteHaus IAM)

**Files:**

- Create: `apps/lighthaus-snapshot/` — a minimal static page (plain HTML+JS or a tiny statically-exported Next route) that fetches `status.json` from the R2 public/Cloudflare URL and renders the board.
- Create: deploy config for Cloudflare Pages + Cloudflare Access (notes/README; actual CF config is done in the dashboard, not code).

**Interfaces:** Reads the `StatusSnapshot` JSON shape from Task 15. **Depends on nothing SiteHaus-hosted** — no platform DB, no IAM. Behind Cloudflare Access (staff).

- [ ] **Step 1:** build the static page: fetch `${R2_STATUS_PUBLIC_URL}/status.json`, render groups/rows + `generatedAt` timestamp prominently (stale timestamp = signal). Show a clear banner if the snapshot is older than ~5 min.
- [ ] **Step 2:** document the Cloudflare Pages project + Cloudflare Access policy (staff emails) in a README; this is the war-room view that survives a full platform outage.
- [ ] **Step 3:** commit `:sparkles: lighthaus — independent availability snapshot page (Cloudflare)`.

> Keep this deliberately tiny and dependency-free. Its entire value is surviving when everything else is down.

---

## Phase 7 — Docker + deploy wiring

### Task 25: `lighthaus-api` Dockerfile

**Files:** Create `apps/lighthaus-api/Dockerfile`.

- [ ] Mirror `apps/api/Dockerfile`, swapping the turbo filter and deploy filter to `lighthaus-api`, and `EXPOSE 3007`, `CMD ["node","dist/main.js"]`. Build locally: `docker build -f apps/lighthaus-api/Dockerfile -t lighthaus-api:test .`. Commit `:whale: lighthaus-api — production Dockerfile`.

---

### Task 26: Compose service + env + Vercel/Cloudflare + migrate-on-deploy

**Files:** Modify `docker-compose.prod.yml`; create `apps/lighthaus-api/.env.example`, `apps/lighthaus/.env.example`; update `.env.example` + `apps/api/.env.example`; note Vercel + Cloudflare deploys.

- [ ] **Step 1:** add the `lighthaus-api` service to `docker-compose.prod.yml` on `sitehaus-network`, `depends_on: [postgres, redis]`, `ports: ["3007:3007"]`, image `ghcr.io/sitehaus/sitehaus-lighthaus-api:latest`, `env_file: ./apps/lighthaus-api/.env`.
- [ ] **Step 2:** env docs — `lighthaus-api`: `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `OPS_RECIPIENTS`, `HEALTHCHECKS_URL`, `LIGHTHAUS_URL`, `LIGHTHAUS_PORT`, `JWT_SECRET` (match apps/api), `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_STATUS_BUCKET`/`R2_STATUS_PUBLIC_URL`, `LIGHTHAUS_UI_ORIGIN`, `ONEHEALTH_CLIENT_ID`, `APP_VERSION`. `apps/lighthaus` (Vercel): `LIGHTHAUS_API_URL`, OAuth client id/redirect, `@site-haus/sdk` config. Add `OPS_RECIPIENTS` to `apps/api/.env.example`.
- [ ] **Step 3:** `apps/lighthaus` deploys to **Vercel** (own project, like dashboard); the snapshot page to **Cloudflare Pages**. Document both. Ensure CD runs `pnpm --filter @site-haus/db db:migrate` before `lighthaus-api` boots (check `.github/workflows/cd.yml`).
- [ ] **Step 4:** commerce `worker` heartbeat (cross-repo follow-up): in `sitehaus-commerce/apps/worker`, POST `{ service: "commerce-worker" }` to `http://<vps>:3007/heartbeat` on a repeatable schedule. Tracked separately.
- [ ] **Step 5:** commit `:whale: lighthaus — compose service + env + deploy wiring`.

---

## Phase 8 — Final verification

### Task 27: Full suite + integration smoke + PR

- [ ] **Step 1:** run suites: `pnpm --filter @site-haus/monitoring test`, `pnpm --filter lighthaus-api test`, `pnpm --filter api test`. All pass.
- [ ] **Step 2:** `pnpm check-types` and build the touched packages/apps (`@site-haus/db`, `@site-haus/monitoring`, `@site-haus/transactional`, `lighthaus-api`, `lighthaus`, `api`).
- [ ] **Step 3:** local e2e (dev DB + Redis): `pnpm --filter @site-haus/db db:migrate`; boot `lighthaus-api` (config sync + a fast cycle in logs); `curl localhost:3007/health`; `curl -XPOST localhost:3007/heartbeat -d '{"service":"commerce-worker"}'` → row written; obtain an IAM token and `curl -H "Authorization: Bearer <staff-token>" localhost:3007/status` → all groups; with a client token → only that client's monitors; confirm `status.json` lands in R2 (or the injected fake in tests); load `apps/lighthaus` and the snapshot page.
- [ ] **Step 4:** address the Minor findings logged in `.superpowers/sdd/progress.md` (final-review triage), then push + PR:

```bash
git push -u origin feat/lighthaus
gh pr create --base release/commerce-flagship --title "Lighthaus monitoring & status system" --body "Implements docs/superpowers/specs/2026-06-26-lighthaus-monitoring-design.md (Revision v2)"
```

> PR base is `release/commerce-flagship` (this branch sits on top of the commerce work).

---

## Self-Review (Revision v2)

**Spec coverage:** pure core (Tasks 1–8 ✅ done); tables incl `client_id` (9); collector = scaffold/repo/dispatcher/scheduler/heartbeat (10–14); R2 snapshot (15); JWT guard + per-tenant scoped read API (16); api job types/renders/processor/health (17–20); `/api/health` across apps (21); status UI scaffold+auth/board/detail (22–23); independent snapshot page (24); Docker/compose/Vercel/Cloudflare/env (25–26); verify+PR (27). Two-tier failure-domain design and per-tenant scoping (spec §0) are realized by Tasks 15+16+24.

**Type consistency:** `LighthausJob` (12) ≡ `NotificationJobData` additions (17); `CheckResult` (core) vs `CheckResultRow` (db) kept distinct; `StatusSnapshot` (15) is the contract for the snapshot page (24); the scoped-read viewer shape `{ isStaff, clientIds }` is shared by repo (11) and status service (16).

**Open items (deploy-time, spec §0/§12):** real `clientId`s for client-site monitors; production hostnames; ops recipients; `HEALTHCHECKS_URL`; R2 bucket/credentials + public URL; Cloudflare Access policy; confirm `apps/api` JWT secret/encoding to mirror; OAuth client registration for the status UI; commerce gateway/payments health + worker heartbeat (cross-repo).
