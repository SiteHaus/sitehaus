# Lighthaus Status Board — Production / Staging Tabs — Design Spec

**Date:** 2026-07-04
**Status:** Approved (brainstorm) → implemented
**Scope:** `apps/lighthaus/app/_components/status-board.tsx`
**Branch:** `feat/lighthaus`

## Problem

Staging services now sit on the board as a fourth group alongside production. That's
dev noise in the default view, and a broken staging box makes the header headline
read "Some systems are down" even when production is perfectly healthy.

## Decisions (locked during brainstorm)

| Question       | Decision                                                                    |
| -------------- | --------------------------------------------------------------------------- |
| Structure      | Split into **Production / Staging tabs**, staff only. Production default.   |
| Headline scope | **Production only** — a down staging service never drives the top headline. |
| Staging tab    | Plain secondary tab (no status indicator for now).                          |
| Clients        | **No tabs** — clients only ever see their own `client-site` group.          |

## Design

In `status-board.tsx`:

- Partition `data.groups` into `prodGroups` (everything except `staging`) and
  `stagingGroups` (`group === "staging"`).
- `showTabs = data.isStaff && stagingGroups.length > 0`.
  - **Tabs** (`@site-haus/ui/base/tabs`): Production (default) renders `prodGroups`;
    Staging renders `stagingGroups`. Each tab maps groups to the existing `GroupCard`.
  - **Otherwise** (clients, or staff with no staging) render all groups flat — the
    prior behavior, so clients never see tabs.
- Header subtitle uses `overallLabel(prodGroups)` — production-scoped headline.
- A local `renderGroups(groups)` helper avoids duplicating the GroupCard map across
  the two tabs and the flat path.

Client sites are production (live), so they live under the Production tab; only the
`staging` group moves to the Staging tab.

## Verification

- `pnpm check-types` + `pnpm build` green for `lighthaus`.
- Visual QA: staff view shows Production/Staging tabs (Production default, headline
  ignores staging); client view shows no tabs, just "Your Website".

## Non-goals

- No backend/config/scoping changes; pure presentation in one component.
- No staging-tab status indicator (deferred; easy follow-up).
