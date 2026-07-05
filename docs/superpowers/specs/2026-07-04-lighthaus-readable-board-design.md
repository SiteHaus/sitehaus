# Lighthaus Status Board — Readability & Audience-Aware Labels — Design Spec

**Date:** 2026-07-04
**Status:** Approved (brainstorm) → implementing
**Scope:** `apps/lighthaus` status board — labels, group headings, and check-row hierarchy
**Branch:** `feat/lighthaus`

## Problem

The board is hard to read at a glance and speaks the wrong language to clients:

1. **Flat hierarchy** — checks render at nearly the same visual weight as the site
   header above them, so nothing signals "the site is the thing; these are its parts."
2. **Jargon** — check labels are raw technical terms (HTTP, DNS, SSL, DOMAIN, EMAIL
   DNS). A non-technical business owner (SiteHaus's clients — construction firms,
   local SMBs) doesn't know what "DNS" means for their website.
3. **Raw enum headings** — group titles show the DB enum keys (`client-site`,
   `commerce-service`, `staging`) rather than proper display names.

## Decisions (locked during brainstorm)

| Question            | Decision                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Label voice         | **Audience-aware.** Clients see plain nouns; staff keep the technical term. The board already knows `isStaff`.                                               |
| Client vocabulary   | **Plain nouns:** http→Website · dns→Can be found · ssl→Secure connection · domain→Domain renewal · email_dns→Email setup.                                    |
| Group names         | **Concise.** client-site→"Client Sites" (client sees **"Your Website"**) · sh-service→"SiteHaus Platform" · commerce-service→"Commerce" · staging→"Staging". |
| Check-row hierarchy | **Indented & de-emphasized** — smaller, muted, small dot, indented under the site. Site header stays the prominent hero.                                     |
| Per-check data      | **Keep** latency (ping) and last-checked timestamp on every row — they're valued. De-emphasis comes from styling, not from removing data.                    |

## Design

### 1. Label vocabularies + selector — `lib/status.ts`

- Keep existing `checkTypeLabel(type)` → technical (staff): HTTP, DNS, SSL, DOMAIN,
  EMAIL DNS, HEALTH, HEARTBEAT.
- Add `checkTypeLabelFriendly(type)` → client plain nouns (mapping above); platform
  check types (`service_health`→"Service", `heartbeat`→"Background worker") mapped
  too for safety, though clients never see those groups.
- Add `checkLabel(type, isStaff)` → returns technical when staff, friendly otherwise.

### 2. Group display names — `lib/status.ts`

- Add `groupLabel(group, isStaff)`:
  - `client-site` → `isStaff ? "Client Sites" : "Your Website"`
  - `sh-service` → "SiteHaus Platform" · `commerce-service` → "Commerce" · `staging` → "Staging"
  - fallback → existing `label(group)` humanization.
- Replaces `label(group)` in the group-card header.

### 3. Scannable hierarchy — `monitor-row.tsx` (used only by `group-card`)

- **Indented** under the site (left padding), **smaller + muted** text, small status dot.
- Label from `checkLabel(type, isStaff)`.
- Right side keeps the uptime bar + % + **latency** + **"checked {date}"** (unchanged data).
- **Status word only when not healthy:** an `up` check is just its colored dot +
  label (clean); `down`/`degraded` shows the colored status text (+ "since …") so
  problems stand out. The site accordion header already carries the rollup status.

### 4. Thread `isStaff`

`StatusBoard` (has `data.isStaff`) → `GroupCard` prop → `MonitorRow` prop, so both
the group heading and every check label adapt to the viewer.

**Files:** `lib/status.ts` (labels + group names), `status-board.tsx` (pass isStaff),
`group-card.tsx` (`groupLabel` + indent container + pass isStaff), `monitor-row.tsx`
(dense/indented restyle + audience label). No backend/data changes.

## Verification

- `pnpm check-types` + `pnpm build` green for `lighthaus`.
- Visual QA both audiences: staff view (technical labels, "Client Sites" etc.) and a
  client login (plain nouns, "Your Website", only their own site visible).

## Non-goals

- No backend, monitor-config, or scoping changes.
- No change to the vivid status semaphore (dots/bars stay emerald/amber/red).
- No new check types or data fields.
