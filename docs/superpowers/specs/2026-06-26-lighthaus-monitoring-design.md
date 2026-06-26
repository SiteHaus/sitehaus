# Lighthaus — Monitoring & Status System

**Date:** 2026-06-26
**Status:** Design (approved-pending-review)
**Author:** SiteHaus eng

---

## 1. Why this exists

A client site (`onehealthclinics.com`) went fully down with **no code change**. Root
cause was DNS: the registrar (GoDaddy) still delegated to old SiteGround
nameservers, SiteGround had dropped the zone, so their NS answered `REFUSED` →
global `SERVFAIL` → nothing resolved. Nobody was watching the
DNS/SSL/domain/email layer.

**Lighthaus** is the keeper that watches the coast. It must catch that *class* of
failure — DNS, SSL, domain-registration, email-DNS, and service health — not just
application bugs. It is internal/ops-facing, never client-facing.

---

## 2. Repo grounding (verified 2026-06-26)

Every claim below was checked against the actual codebase. Drift from the
original brief is called out.

### Confirmed ✅
- **Notifications system** (`apps/api/src/notifications/`) is exactly as assumed:
  - `NOTIFICATIONS_QUEUE = 'notifications'` (exported from `notifications.service.ts`).
  - `NotificationsService.enqueue(job)` → `queue.add(job.type, job, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 200 })`.
  - `NotificationJobData` is a 4-member union (`milestone.completed`, `milestone.signed_off`, `comment.created`, `billing.payment_failed`).
  - `NotificationsProcessor extends WorkerHost` switches on `job.data.type`, renders via `@site-haus/transactional/render/notifications`, sends via `EmailService`.
- **`@site-haus/db`** — `schema.ts` merges `iam` + `core` namespaces into one
  `schema` object, exports `Db` type, `createDb(pool)`, and the drizzle operator
  helpers. Migrations live in `packages/db/migrations`.
- **`@site-haus/transactional`** — package-export subpaths `./render/*` and
  `./emails/*`. `src/render/notifications.tsx` exposes `renderXEmail()` fns that
  wrap a single generic `NotificationEmail` component
  (`{ previewText, title, body, context: {label,value}[], ctaText, ctaUrl }`).
  **The alert/digest emails reuse this component — no new email component needed.**
- **`EmailService.send(opts)`** signature:
  `{ to: string|string[], subject, html?, text?, from?, replyTo?, tags?: Record<string,string> }`
  → `Promise<{ messageId }>`. Honors `cfg.enabled` / `cfg.devRedirect`. Throws on
  Resend error.
- **commerce `worker`** (`sitehaus-commerce/apps/worker`) is a pure
  `NestFactory.createApplicationContext` app (no HTTP/TCP listener) that
  self-registers BullMQ **repeatable** jobs on boot via cron patterns. This is the
  template for Lighthaus's scheduler and the thing that emits the worker heartbeat.
- **No duplication.** Nothing monitoring/uptime/RDAP/status-page exists in either
  repo. Every "status" hit in the tree is unrelated UI (design-doc/order status
  badges). This is greenfield.

### Drift / corrections ⚠️
1. **`api` already has a health controller**, but not the spec's shape.
   `apps/api/src/health/health.controller.ts` serves `GET /health` →
   `{ status: 'ok' }` and `GET /health/db`. Lighthaus needs `{ status, uptime,
   version }`. → **Upgrade** the existing controller rather than add a new one;
   the route stays `/health` (Caddy/origin already expose it). The brief's
   "`/api/health`" is the externally-routed path; internally it's the `health`
   controller.
2. **Two independent compose stacks, each with its own Postgres AND its own
   Redis, on separate Docker networks** — this is the biggest correction:

   | Stack | Network | Postgres | Redis | Notable services |
   |---|---|---|---|---|
   | `sitehaus/docker-compose.prod.yml` | `sitehaus-network` | ✅ (the `@site-haus/db` DB) | ✅ (the notifications queue) | api, web, dashboard, iam, commerce-ui, caddy |
   | `sitehaus-commerce/docker-compose.prod.yml` | `sitehaus-commerce-network` | ✅ (separate) | ✅ (separate) | gateway, payments, **worker**, caddy |

   **Consequence:** Lighthaus lives in the **`sitehaus` stack**, because that is
   where both the shared `@site-haus/db` Postgres *and* the notifications Redis
   already are. It never touches the commerce DB/Redis — it watches commerce
   services **over HTTP** (`/api/health`) and the commerce `worker` heartbeats
   Lighthaus **over HTTP** across the network boundary (published port / internal
   URL). "Shared Postgres" in the brief is true *within* the sitehaus stack.
3. **Packaging decision (locked):** the scheduler shell is a **new NestJS app
   `apps/lighthaus`** (own container, own failure domain), not a module inside
   `api`. If it shared `api`'s process it could not detect `api` going down.

---

## 3. Naming

| Thing | Name | Rationale |
|---|---|---|
| Deployable container (NestJS) | **`apps/lighthaus`** | The product/brand. Mirrors `apps/api`. |
| Pure check + incident core | **`@site-haus/monitoring`** (`packages/monitoring`) | Framework-free, reusable, swappable — brand must not leak into pure logic. |
| DB tables | `monitors`, `check_results`, `incidents` | Descriptive. |
| Notification job types | `lighthaus.incident_opened`, `lighthaus.incident_resolved`, `lighthaus.daily_digest` | Branded queue events. |
| Dashboard route | `/status` | User-facing word. |

> Chose **lighthaus** over "lighthouse" deliberately: "lighthouse" collides with
> Google Lighthouse (web-perf auditing) in a repo full of Next.js sites.

---

## 4. Architecture

```
                         ┌─────────────────────── sitehaus-network ───────────────────────┐
                         │                                                                 │
  client sites (Vercel)  │   ┌─────────────┐   enqueue lighthaus.*    ┌──────────────┐     │
  sh services ───HTTP────┼──▶│  apps/       │──────────────────────▶ │  redis        │    │
  commerce services ─────┼──▶│  lighthaus   │     (NOTIFICATIONS_     │ (notifications│    │
  DNS / SSL / RDAP ──────┼──▶│  (scheduler  │      QUEUE)             │  queue)       │    │
  email DNS              │   │   + dispatch │                         └──────┬───────┘     │
                         │   │   + heartbeat│         writes                 │             │
  commerce worker ─HTTP──┼──▶│   ingest)    │──────┐  check_results   ┌──────▼───────┐     │
   (heartbeat)           │   └──────┬───────┘      └────────────────▶ │   api         │    │
                         │          │ pings                            │ Notifications │    │
                         │          ▼                                  │ Processor →   │    │
                         │   healthchecks.io  (dead-man's-switch,      │ EmailModule   │    │
                         │   independent failure domain)               │ (ops emails)  │    │
                         │          │                                  └──────┬───────┘     │
                         │   ┌──────▼───────┐                                 │             │
                         │   │  postgres    │◀──── reads (/status) ───────────┼─── dashboard│
                         │   │ monitors/    │      via @site-haus/db          │   (Vercel)  │
                         │   │ check_results│                                 │             │
                         │   │ incidents    │                                 ▼             │
                         │   └──────────────┘                          Resend (failsafe +   │
                         └─────────────────────────────────────────── ops digest) ─────────┘
```

**Two failure domains on purpose:**
- Primary alert path: Lighthaus → Redis → api Notifications Processor → Resend.
- If Redis is unreachable, Lighthaus **falls back to a direct Resend send** for
  that alert (so a Redis outage still pages ops).
- If Lighthaus/VPS itself dies, **healthchecks.io** (external) stops receiving the
  per-cycle ping and emails the team — independent of our infra.

---

## 5. Components

### 5.1 `@site-haus/monitoring` (pure core — NO Next/Vercel/Docker/Nest imports)

Pure, unit-testable functions. Each returns:

```ts
type CheckResult = {
  status: 'up' | 'degraded' | 'down';
  latencyMs?: number;
  detail: Record<string, unknown>;   // structured, jsonb-friendly
};
```

Functions:
- `checkHttp(target, opts)` — uptime + latency; non-2xx/timeout → `down`.
- `checkDns(host)` — resolves A/AAAA; **`SERVFAIL` / `REFUSED` / no-answer → `down`**
  (the onehealthclinics case). Uses node `dns/promises` with explicit error-code
  mapping; injectable resolver for tests.
- `checkSsl(host)` — TLS cert expiry; `< 14d` → `degraded`, expired/invalid → `down`.
- `checkDomainExpiry(domain)` — registration expiry via **RDAP**; `< 30d` →
  `degraded`. Injectable fetch for tests.
- `checkEmailDns(domain, { dkimSelector })` — MX present + SPF (`v=spf1`) + DKIM
  TXT present; any missing → `degraded`/`down` per policy.
- `checkServiceHealth(url)` — `GET <url>` expects `200` + `{ status: 'ok' | ... }`.
- `evaluateHeartbeat(lastSeenAt, now, maxSilenceMs)` — silence beyond threshold →
  `down`.

**Incident state machine (pure):**

```ts
type IncidentState = { consecutiveFailures: number; open: boolean };
type Transition =
  | { kind: 'none' }
  | { kind: 'open' }       // crossed failure threshold → open + alert
  | { kind: 'resolve' };   // recovered → resolve + alert

function reduceIncident(
  state: IncidentState,
  result: CheckResult,
  opts: { failureThreshold: number },  // default 2
): { state: IncidentState; transition: Transition };
```

Rules: a single blip (1 failure) → `none`. `failureThreshold` (=2) consecutive
failures while not-open → `open`. Any `up` while open → `resolve`. `degraded`
counts as a failure for SSL/domain warnings only if the monitor's policy says so
(thresholds in config); by default `degraded` does **not** open an outage incident
— it raises a warning-class incident handled by the daily digest, not a page.
(Decision: keep paging for `down`; surface `degraded` in digest. Avoids paging ops
at 3am because a cert has 13 days left.)

### 5.2 `apps/lighthaus` (NestJS, thin shell — own container)

Mirrors `apps/worker`. Modules/services:
- **`SchedulerService`** — `@Interval`-driven loops (Nest schedule) or a manual
  `setInterval` bootstrap. Two cadences: fast (HTTP/DNS/service-health/heartbeat)
  every **2 min**; slow (SSL/domain/email-DNS) **daily**. Loads `monitors.config.ts`,
  runs *due* checks, calls core fns, persists `check_results`, runs `reduceIncident`,
  opens/resolves `incidents`.
- **`DispatcherService`** — on `open`/`resolve` transitions, `enqueue` a
  `lighthaus.*` job onto `NOTIFICATIONS_QUEUE`. **Resend failsafe:** wrap enqueue in
  try/catch; on Redis failure, render the email locally (reuse transactional render
  fns) and `EmailService`-style direct Resend send to ops recipients.
- **`HeartbeatController`** — `POST /heartbeat` (tiny HTTP ingest). Body
  `{ service: string, ts?: string }`. Upserts `last_seen` for that service's
  heartbeat monitor. The commerce `worker` POSTs here each cycle.
- **`DigestService`** — daily **08:00** job: green summary + 24h uptime % per
  monitor + any open incidents + `degraded` warnings → enqueue
  `lighthaus.daily_digest`.
- **dead-man's-switch** — each scheduler cycle `GET`/`POST` the healthchecks.io
  ping URL.
- **`monitors.config.ts`** — typed array of targets in-repo (see §7). No CRUD UI
  (YAGNI); schema supports it later.

The app reuses `@site-haus/db` (createDb against sitehaus Postgres), `bullmq`
(same queue name + job shape), and `resend` directly for the failsafe.

### 5.3 Data model — new `packages/db/src/monitoring/` domain

A **third domain folder** alongside `iam/` and `core/` (monitoring is neither
identity nor client/project data). Merged into `schema` in `schema.ts`.

```
monitors
  id            uuid pk
  name          text
  type          text   -- 'http'|'dns'|'ssl'|'domain'|'email_dns'|'service_health'|'heartbeat'
  target        text   -- url | host | domain | service-id
  thresholds    jsonb  -- { failureThreshold, sslWarnDays, domainWarnDays, maxSilenceMs, dkimSelector, ... }
  group         text   -- 'client-site'|'sh-service'|'commerce-service'
  enabled       boolean default true
  created_at / updated_at

check_results
  id            uuid pk
  monitor_id    uuid fk → monitors
  status        text   -- 'up'|'degraded'|'down'
  latency_ms    integer null
  detail        jsonb
  checked_at    timestamptz   -- INDEXED (monitor_id, checked_at desc)

incidents
  id            uuid pk
  monitor_id    uuid fk → monitors
  opened_at     timestamptz
  resolved_at   timestamptz null
  last_status   text
  notified_open     boolean default false
  notified_resolved boolean default false
```

Migration generated via `pnpm db:gen` in `packages/db`, committed under
`packages/db/migrations`, applied with `pnpm db:migrate`.

### 5.4 `api` changes

- **`notifications.types.ts`** — extend `NotificationJobData` with:
  ```ts
  | { type: 'lighthaus.incident_opened'; monitorId; monitorName; group; status; detail; openedAt }
  | { type: 'lighthaus.incident_resolved'; monitorId; monitorName; group; openedAt; resolvedAt; downtimeMs }
  | { type: 'lighthaus.daily_digest'; date; summary: { monitorName; group; uptime24h; status }[]; openIncidents: {...}[] }
  ```
- **`notifications.processor.ts`** — add three `case` branches → render via new
  transactional fns → send to **ops recipients** (not client users). Add
  `OPS_RECIPIENTS` config (env, comma-separated) + an `ops.config.ts` provider.
- **`health.controller.ts`** — upgrade `GET /health` → `{ status, uptime, version }`
  (`uptime = process.uptime()`, `version` from env/package). Keep `/health/db`.

### 5.5 `transactional` — new render fns (reuse `NotificationEmail`)

Add to `src/render/notifications.tsx` (or a sibling `lighthaus.tsx` exported via
`./render/*`):
- `renderIncidentOpenedEmail({ monitorName, group, status, detailLines, ctaUrl })`
- `renderIncidentResolvedEmail({ monitorName, group, downtimeFormatted, ctaUrl })`
- `renderDailyDigestEmail({ date, rows, openIncidents, ctaUrl })`

`ctaUrl` → dashboard `/status`. All reuse the existing `NotificationEmail`
component (title/body/context/cta).

### 5.6 `dashboard` `/status` UI (Vercel, auth-gated, internal)

App-Router route `app/(dashboard)/status/` (employee-only — reuse existing
`use-is-employee` gate). TanStack Query hooks read the shared Postgres via
`@site-haus/db` (server components / route handlers — **no cross-service API**).
Layout:
- Per-**group** cards (`client-site`, `sh-service`, `commerce-service`).
- Each row: green/amber/red dot + latency + last-checked relative time.
- 90-day uptime bar (sparkline of `check_results`).
- Open-incident timeline.

Follows dashboard standards (one component per file, thin page, query keys in
`lib/query-keys.ts`, format helpers from `@site-haus/utils`).

### 5.7 `/api/health` across apps

Add a `200 + { status, uptime, version }` health endpoint to apps lacking one:
- Next apps (`web`, `dashboard`, `docs`, `iam`, `commerce`): `app/api/health/route.ts`.
- Nest apps (`api` already → upgrade; commerce `gateway`, `payments`): health
  controller. (commerce services live in the other repo — add there.)

---

## 6. Cadence & alerting rules

| Check class | Cadence |
|---|---|
| HTTP uptime+latency, DNS, service `/api/health`, heartbeat eval | every **2 min** |
| SSL expiry, domain (RDAP), email-DNS | **daily** |
| Daily digest | **08:00** local |

- Alert (open incident) after **2 consecutive `down`** results.
- On recovery (`up` while open): **resolve incident + send recovery email**.
- `degraded` (SSL <14d, domain <30d, email-DNS partial): surfaced in **digest**,
  does not page.
- Every cycle: ping **healthchecks.io** (dead-man's-switch).

---

## 7. Config shape (`apps/lighthaus/src/monitors.config.ts`)

```ts
export const monitors: MonitorConfig[] = [
  { name: 'onehealthclinics.com', group: 'client-site', checks: [
      { type: 'http', target: 'https://onehealthclinics.com' },
      { type: 'dns', target: 'onehealthclinics.com' },
      { type: 'ssl', target: 'onehealthclinics.com', thresholds: { sslWarnDays: 14 } },
      { type: 'domain', target: 'onehealthclinics.com', thresholds: { domainWarnDays: 30 } },
      { type: 'email_dns', target: 'onehealthclinics.com', thresholds: { dkimSelector: 'google' } },
  ]},
  { name: 'api', group: 'sh-service', checks: [
      { type: 'service_health', target: 'https://api.sitehaus.../health' } ]},
  { name: 'commerce-worker', group: 'commerce-service', checks: [
      { type: 'heartbeat', target: 'commerce-worker', thresholds: { maxSilenceMs: 180000 } } ]},
  // ...
];
```

Config is the source of truth; `monitors` rows are upserted from it on boot
(idempotent, keyed by name+type+target).

---

## 8. Environment / wiring

`apps/lighthaus` env:
- `DATABASE_URL` — sitehaus Postgres (same as api).
- `REDIS_URL` / BullMQ connection — sitehaus redis (same as api notifications).
- `RESEND_API_KEY` + `EMAIL_FROM` — for the failsafe direct send.
- `OPS_RECIPIENTS` — comma-separated ops emails (also consumed by api processor).
- `HEALTHCHECKS_URL` — dead-man's-switch ping URL.
- `DASHBOARD_URL` — for email CTAs.
- `LIGHTHAUS_PORT` — heartbeat ingest port.

Compose: new `lighthaus` service in `sitehaus/docker-compose.prod.yml` on
`sitehaus-network`, `depends_on: [postgres, redis]`, own `ghcr.io/sitehaus/sitehaus-lighthaus`
image, heartbeat port published for the commerce worker. Caddy route for the
heartbeat ingest if cross-host.

---

## 9. Testing (TDD — tests first)

Unit-test **every** check fn against mocked DNS/HTTP/TLS/RDAP:
- `checkDns`: the **`SERVFAIL` + `REFUSED`** cases → `down` (the regression that
  started this).
- `checkSsl`: expired cert → `down`; 10-days-out → `degraded`; healthy → `up`.
- `checkDomainExpiry`: RDAP 20-days-out → `degraded`.
- `checkEmailDns`: missing SPF/DKIM/MX permutations.
- `checkHttp`/`checkServiceHealth`: timeout, non-2xx, slow-latency.
- `evaluateHeartbeat`: fresh vs stale.

Incident state machine: blip→`none`; 2 fails→`open`+alert; recovery→`resolve`+alert;
no double-open while already open.

Dispatcher: **Redis-down → Resend failsafe** path is exercised (mock enqueue throw,
assert direct send).

Core package has zero framework imports → tests run with plain Jest, no Nest TestBed.

---

## 10. Build sequence

1. `packages/monitoring` pure core (check fns + incident machine) — fully tested.
2. `packages/db` monitoring domain tables + migration.
3. `apps/lighthaus`: scheduler + dispatcher + `monitors.config.ts` + persistence.
4. `api`: `lighthaus.*` job types + processor branches + ops recipients +
   `health` upgrade. Lighthaus Redis enqueue + Resend failsafe.
5. healthchecks.io ping + worker heartbeat ingest (+ commerce worker POST).
6. `/api/health` endpoints across remaining apps.
7. dashboard `/status` UI.
8. Dockerfile + compose entry + env wiring.

---

## 11. Out of scope (YAGNI)

- Monitor CRUD UI (config-file driven; schema supports it later).
- Per-user alert routing / on-call rotations / escalation policies.
- Status history beyond what `check_results` retention provides.
- Public status page (this is internal/ops-only).
- Multi-region probing.

---

## 12. Open items to confirm at review

- Exact production hostnames for `service_health` targets (api/iam/dashboard/web/
  docs/commerce/gateway/payments) and the heartbeat ingest URL the commerce worker
  should POST to (published port vs Caddy route).
- Ops recipient list + `HEALTHCHECKS_URL` provisioning.
- DKIM selector(s) per domain for `checkEmailDns` (Google Workspace default
  `google`).
- Whether `degraded` should ever page (current decision: no — digest only).
