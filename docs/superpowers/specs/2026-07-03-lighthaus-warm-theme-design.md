# Lighthaus Warm Theme + Shared Extraction — Design Spec

**Date:** 2026-07-03
**Status:** Approved (brainstorm) → implementing
**Scope:** `apps/lighthaus` (status UI, :3006) adopts the commerce warm-editorial look;
the theme is extracted into a shared `packages/ui` stylesheet that commerce also consumes.
**Branch:** `feat/lighthaus`

## Problem

`apps/lighthaus` ships on the default shadcn neutral-gray theme (its `globals.css` is 4
lines, no brand fonts wired), while `apps/commerce` has an established warm-editorial /
boutique identity (parchment + terracotta, Fraunces / Inter Tight / JetBrains Mono, motion
tokens, status tones) defined inline in `apps/commerce/app/globals.css` per the
2026-06-25 commerce design-language spec. The two apps read as different products.

## Goal

Make Lighthaus feel like the same SiteHaus product as commerce, and stop the warm theme
from living as a single-app copy: extract it into `packages/ui` so both apps share one
source of truth (no drift).

## Decisions (locked during brainstorm)

| Question      | Decision                                                                                                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status colors | **Keep vivid emerald/amber/red semaphore** for dots + uptime bars (status-page legibility). Warm everything else — surfaces, cards, fonts, borders, text.                                                              |
| Theme home    | **Extract `packages/ui/src/styles/warm.css`** as a pure override layer imported after `default.css`. Both commerce and lighthaus `@import` it. DRY, no drift.                                                          |
| Snapshot page | **Out of scope.** `apps/lighthaus-snapshot` stays dependency-free (own failure domain, no shared CSS).                                                                                                                 |
| Design kit    | **Not imported.** The commerce 7-primitive kit is admin-shaped (tables/filters/forms). Lighthaus is a customer-facing status board — apply commerce's _type roles_ + warm surfaces to its existing components instead. |

## Architecture

`default.css` (shadcn base: `@theme inline` + neutral `:root`/`.dark`) is unchanged.
`warm.css` overrides the palette vars, radius, fonts helpers, motion, and tones. Because it
imports **after** `default.css`, its `:root`/`.dark` win; the `@theme inline` mappings in
`default.css` (e.g. `--color-background: var(--background)`) then resolve to warm values, so
Tailwind utilities pick up the warm palette automatically. No `@theme` or package.json
export changes needed (`./styles/*` already covers the new file).

### Files

1. **`packages/ui/src/styles/warm.css`** _(new)_ — the warm identity lifted verbatim from
   commerce `globals.css` lines 6–200: warm `:root` + `.dark` palettes, `--radius: 0.5rem`,
   `body` / `.font-display` / `.font-numeric-id` font rules, motion tokens
   (`--motion-base`, `--ease-out`, `@keyframes sh-fade-in`, `.sh-fade-in`), status tones
   (`.tone-*`, `.status-badge`).
2. **`apps/commerce/app/globals.css`** → collapses to imports only
   (`tailwindcss` → `default.css` → `warm.css`) + `@source`. Behavior-preserving.
3. **`apps/lighthaus/app/globals.css`** → same three imports.
4. **`apps/lighthaus/app/layout.tsx`** → wire Fraunces / Inter Tight / JetBrains Mono via
   `next/font/google` as `--font-display` / `--font-body` / `--font-mono`, mirroring
   commerce, and apply the variable classes to `<html>`. (Fonts stay per-app — `next/font`
   is app-level config, not shareable via CSS.)

### Lighthaus composition (type roles + warm surfaces; dots/bars stay vivid)

- `status-board.tsx` — title → `font-display`; add commerce **eyebrow**
  (`text-[11px] font-semibold tracking-[0.14em] uppercase text-primary`, label "Status");
  "Staff view" pill warmed.
- `group-card.tsx` — group header label → eyebrow; warm card surface + `rounded-xl`.
- `monitor-row.tsx` — check-type badge adopts `.status-badge` tone styling; latency +
  timestamps → mono (`font-numeric-id`); status dots + `UptimeBar` unchanged (vivid).
- `monitor-detail.tsx` + `incident-timeline.tsx` — same type roles, warm section cards.

Lighthaus's `STATUS_META` (emerald/amber/red) is **not** changed.

## Verification

- `pnpm check-types` + `pnpm lint` + `pnpm build` green for `@site-haus/ui`, `commerce`,
  `lighthaus`.
- Visual QA both apps, light + dark.
- **Commerce must render identically to before** (theme relocated, not changed).

## Non-goals

- No changes to `default.css` / dashboard / iam (they keep the neutral theme).
- No palette/font changes to the theme itself — verbatim relocation.
- No snapshot-page restyle. No backend/data changes.
