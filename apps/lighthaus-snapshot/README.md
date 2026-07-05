# lighthaus-snapshot

The **war-room availability page** — the view that survives a full SiteHaus
outage. It is a single static `index.html` with zero dependencies, zero build
step, and **no dependency on any SiteHaus-hosted service** (not IAM, not the
dashboard, not lighthaus-api). It renders the `status.json` snapshot that
`lighthaus-api` publishes to Cloudflare R2 every fast cycle.

If the platform is down, this page still tells you what's down — that's the
entire point. Keep it tiny.

## How it works

1. `lighthaus-api` (the `SnapshotService`) writes `status.json` to an R2 bucket
   on every fast check cycle (`CacheControl: public, max-age=30`).
2. This page fetches that JSON and renders groups, rows, open incidents, and the
   `generatedAt` timestamp. A **stale banner** appears if the snapshot is older
   than 5 minutes — a stale timestamp means the monitor itself is likely down.
3. The page auto-refreshes every 30s.

### Data source resolution

The page picks its data URL from the first of these that is set:

1. `?src=<url>` query param — ad-hoc override for testing.
2. `window.STATUS_SRC` — set by an optional adjacent `config.js`
   (see `config.example.js`).
3. `./status.json` — same-origin default.

Prefer option 3: proxy `/status.json` from the R2 bucket on the same origin so
there are no cross-origin/CORS concerns. Otherwise drop in a `config.js`.

## Deploy — Cloudflare Pages + Cloudflare Access

This is configured in the Cloudflare dashboard, not in code.

### 1. Cloudflare Pages project

- **Framework preset:** None.
- **Build command:** _(none — static)_.
- **Build output directory:** `apps/lighthaus-snapshot`.
- Custom domain: e.g. `status-internal.sitehaus.dev`.

### 2. Serve `status.json` on the same origin (recommended)

Bind the R2 bucket that `lighthaus-api` writes to, or add a redirect so
`/status.json` resolves to the bucket object. Then leave the page on its
`./status.json` default. If you can't, copy `config.example.js` → `config.js`
and point `window.STATUS_SRC` at the public R2 URL.

### 3. Cloudflare Access policy (staff only)

Put the whole project behind **Cloudflare Access** so only SiteHaus staff can
reach it:

- Application type: **Self-hosted**, domain = the Pages custom domain.
- Policy: **Allow** where **Emails** ∈ the staff allow-list (or an
  `Email domain` = `sitehaus.dev` rule, plus any external ops emails).
- Session duration: short (e.g. 24h).

Because Access runs at Cloudflare's edge — upstream of every SiteHaus service —
authentication for this page holds even during a total platform outage.

## Local preview

```bash
cd apps/lighthaus-snapshot
python3 -m http.server 8080
# then open http://localhost:8080/?src=<any status.json url>
```
