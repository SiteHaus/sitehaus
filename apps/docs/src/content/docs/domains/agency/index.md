---
title: Agency / Dashboard — Feature Inventory
description: What the SiteHaus dashboard (:3001) actually ships — projects, design docs, tickets, billing — and the client/employee role split, verified against code.
---

## Overview

The dashboard (`sitehaus/apps/dashboard`, port 3001) is a shared workspace between
SiteHaus (a web agency) and its non-technical clients. The same Next.js 15 app
serves two audiences and renders different content based on role: SiteHaus
**employees** (first-party staff with manage permissions) see and manage every
client and project; **clients** see only their own. There is no separate client
portal — role is resolved client-side from the IAM auth store.

Every page is `"use client"`; auth runs through the same OAuth2 PKCE + JWT flow
documented in the [Identity & Auth domain](/domains/identity/) via
`@site-haus/sdk` and `@site-haus/stores`. Data comes from the NestJS API
(`apps/api`, :3003) — one module per feature (projects, milestones, tickets,
assets, billing, business-profiles, design-documents, comments, clients, audit) —
backed by the `core` schema in `packages/db/src/core` (projects, milestones,
tickets + attachments, assets, billing-records, business-profiles,
design-documents + versions, comments, audit-logs). Stripe powers billing;
notifications are enqueued to a BullMQ queue. The dashboard has **no commerce
touchpoints** — store management lives in the separate commerce admin app
(see [Commerce domain](/domains/commerce/)).

## Features

| Feature | Where (repo + path) | Status | Key files |
| ------- | ------------------- | ------ | --------- |
| Role-based home views | `sitehaus:apps/dashboard/app/(dashboard)/page.tsx` | live | `_components/client-home-view.tsx`, `_components/employee-home-view.tsx` |
| Projects (list, detail, create, edit, status) | `sitehaus:apps/dashboard/app/(dashboard)/projects/` | live | `projects/page.tsx`, `projects/[projectId]/page.tsx`, `projects/new/page.tsx`, `projects/[projectId]/edit/page.tsx`; API `apps/api/src/projects` |
| Project assets (R2 upload, review status) | `sitehaus:apps/dashboard/app/(dashboard)/projects/[projectId]/assets/` | live | `assets/page.tsx`, `_components/upload-zone.tsx`, `asset-card.tsx`, `asset-sheet.tsx`; `hooks/use-assets.ts`; API `apps/api/src/assets` + `apps/api/src/storage` |
| Design documents (Plate editor, publish, status, version history) | `sitehaus:apps/dashboard/app/(dashboard)/projects/[projectId]/design-document/` | live | `design-document/page.tsx`, `versions/[version]/page.tsx`, `components/design-document/*`, `components/plate-ui/*`; `hooks/use-design-document.ts`, `use-design-doc-versions.ts`; API `apps/api/src/design-documents` |
| Milestones (CRUD, reorder, status, client sign-off) | `sitehaus:apps/dashboard/app/(dashboard)/projects/[projectId]/milestones/` | live | `milestones/page.tsx`, `_components/employee-milestones-view.tsx`, `client-milestones-view.tsx`, `milestone-form-sheet.tsx`; `hooks/use-milestones.ts`; API `apps/api/src/milestones` |
| Tickets (submit, list, detail, edit, assign, status, attachments) | `sitehaus:apps/dashboard/app/(dashboard)/tickets/` | live | `tickets/page.tsx`, `tickets/[ticketId]/page.tsx`, `new/page.tsx`, `[ticketId]/edit/page.tsx`, `_components/*`; `hooks/use-ticket-attachments.ts`; API `apps/api/src/tickets` |
| Comments (polymorphic: ticket / design-doc / project, internal flag) | `sitehaus:apps/dashboard/components/comments/` | live | `comment-list.tsx`, `comment-form.tsx`; `hooks/use-comments.ts`; API `apps/api/src/comments`; db `core/comments.ts` |
| Business profile (client intake; employee review) | `sitehaus:apps/dashboard/app/(dashboard)/profile/`, `clients/[clientId]/business-profile/` | live | `profile/page.tsx`, `_components/profile-form.tsx`, `clients/[clientId]/business-profile/page.tsx`; API `apps/api/src/business-profiles` |
| Clients management (directory + detail) | `sitehaus:apps/dashboard/app/(dashboard)/clients/` | live | `clients/all/_components/employee-clients-view.tsx`, `clients/[clientId]/_components/client-detail-view.tsx`; `hooks/use-clients.ts`; API `apps/api/src/clients` |
| Billing — client (records, Stripe portal link) | `sitehaus:apps/dashboard/app/(dashboard)/billing/_components/client-billing-view.tsx` | live | `hooks/use-billing.ts` (`useBillingClient`); API `apps/api/src/billing`, `apps/api/src/stripe` |
| Billing — admin (MRR overview, create subscription / one-time) | `sitehaus:apps/dashboard/app/(dashboard)/billing/_components/admin-billing-view.tsx` | live | `create-billing-sheet.tsx`, `project-billing-section.tsx`; `hooks/use-billing.ts`; Stripe service `apps/api/src/stripe/stripe.service.ts` |
| Audit logs (filterable activity feed) | `sitehaus:apps/dashboard/app/(dashboard)/audit-logs/` | live | `_components/audit-log-view.tsx`; API `apps/api/src/audit`; db `core/audit-logs.ts` |
| Settings (company + team tabs) | `sitehaus:apps/dashboard/app/(dashboard)/settings/` | live | `_components/settings-view.tsx`, `company-tab.tsx`, `team-tab.tsx` |
| Profile / business intake form | `sitehaus:apps/dashboard/app/(dashboard)/profile/page.tsx` | live | `_components/profile-form.tsx`, `list-inputs.tsx`, `social-input.tsx` |
| Design system showcase page | `sitehaus:apps/dashboard/app/(dashboard)/design/page.tsx` | stale? | Static component/token gallery; **not linked in the sidebar** — appears to be a dev-only/orphaned route |
| Notifications (email) | `sitehaus:apps/api/src/notifications/` | partial | `notifications.service.ts` enqueues to a BullMQ `notifications` queue with retry/backoff; processor present. No in-app notification UI in the dashboard. |
| Calendar / Forms & Surveys / Cron automation | — | not built | Listed in scope (Phase 3); no routes, contracts, or db tables found |

## Role-based access

The split is **client-side and permission-driven**, not a server-enforced route guard:

- `hooks/use-is-employee.ts` — `useIsEmployee()` is a plain Zustand selector that
  returns true only when the user has a **first-party** client membership with
  `canManage` (`s.clients.some(c => c.firstParty && c.canManage)`). Plain
  membership on the dashboard OAuth app does not qualify.
- `hooks/use-client-context.ts` — `useClientContext()` returns the active managed
  client only when it is a **non-first-party** (real) client org; null otherwise.
- Page dispatchers branch on `useIsEmployee()` to pick a view
  (e.g. `page.tsx`, `billing/page.tsx` → admin vs client view component).
- Finer-grained gating uses `useAuthStore(s => s.hasPerm("..."))` (e.g.
  `projects:manage`, `tickets:manage`, `billing:read`, `members:read`,
  `audit:read`) — `hasPerm` is referenced in ~17 dashboard files.
- The sidebar (`components/sidebar/sidebar-links.tsx`) carries per-item
  `requirePerm` / `requireClient` / `showForClients` flags to control visibility.
- `app/(dashboard)/layout.tsx` wraps everything in `RequireAuth`
  (`lib/require-auth.tsx`), which only enforces *authentication* (redirect to
  `/login`, and to IAM `/verify` for unverified users) — **not role**. Role is a
  rendering concern, with real authorization enforced by the API.

| Concern | Client | Employee |
| ------- | ------ | -------- |
| Home | `ClientHomeView` (their projects/tickets) | `EmployeeHomeView` (cross-client, MRR snapshot) |
| Projects | own projects, read-mostly | all projects + create/edit/status |
| Billing | records + Stripe portal link | MRR overview + create subscription/one-time |
| Business profile | edits own (`/profile`) | reviews any (`/clients/[clientId]/business-profile`) |
| Clients / Audit / Settings | hidden (perm-gated) | visible with `members:read` / `audit:read` / `clients:read` |

## Integration points

- **Dashboard → API** (via `@site-haus/stores` `getApi()`, typed by
  `@site-haus/contracts`):
  - Projects → `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `PATCH /projects/:id/status`
  - Milestones → `GET /milestones/upcoming`, `GET/POST /projects/:id/milestones`, `PATCH/DELETE /milestones/:id`, `POST /milestones/:id/sign-off`, `POST /milestones/reorder`
  - Tickets → `GET/POST /tickets`, `GET/PATCH /tickets/:id`, `PATCH /tickets/:id/status`, `/assign`, attachments `GET/POST/DELETE`
  - Assets → `GET/POST /projects/:id/assets`, upload, `PATCH/DELETE /projects/:id/assets/:assetId`
  - Design docs → `GET/POST/PATCH /projects/:id/design-document`, `/publish`, `/status`, `/versions`, `/versions/:version`
  - Billing → `GET /billing`, `GET /billing/portal`, `GET /billing/admin`, `POST /billing/subscriptions`, `POST /billing/one-time`
  - Business profiles → `GET /business-profiles/me`, `GET /business-profiles/:clientId`, `POST /business-profiles`, `PATCH /business-profiles/me`
  - Comments → `GET/POST /comments`, `PATCH/DELETE /comments/:id`
  - Clients → `GET /clients/me/clients`, `/current`, `/me/members`, etc.
  - Audit → `GET /audit`
- **Auth dependency** — OAuth2 PKCE + JWT against the IAM API; bootstrap/refresh
  via `@site-haus/stores` `auth-store`. See the
  [Identity & Auth sweep](/domains/identity/) (not repeated here).
- **Stripe** — `apps/api/src/stripe/stripe.service.ts` (customers, subscriptions
  with `send_invoice`/30-day terms, one-time invoices, billing-portal sessions)
  plus `stripe-webhook.controller.ts` syncing `subscription.updated/deleted` back
  into `core/billing-records`.
- **Cloudflare R2** — asset uploads via `apps/api/src/storage` + `assets` module.
- **No commerce coupling** — confirmed: the dashboard imports nothing from the
  commerce app or `@sitehaus-ecom/*`.

## Notes for deep-dives

- **Design Document** is the scope's "center of gravity" and the richest feature:
  Plate rich-text editor (`components/plate-ui/*`), publish flow, status machine
  (draft → in_review → approved → amended), and immutable version snapshots
  (`core/design-document-versions.ts`). Good candidate for a tier-3 page.
- **Billing / Stripe flow** — end-to-end (employee creates charge → Stripe →
  webhook → `billing-records` → client view + portal link). Candidate for a
  tier-3 sequence diagram.
- **Standards drift** — the dashboard's own `CLAUDE.md` / `standards/react`
  rules (thin pages, React Query everywhere, no inline formatters) are violated
  by several large page files; see the [Findings register](/findings/)
  (F-014 – F-017).
