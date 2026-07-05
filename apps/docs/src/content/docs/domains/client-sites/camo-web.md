---
title: Client Site — camo-web
description: Musician merch + music storefront; the reference authed SiteHaus storefront.
---

For the shared integration pattern (env vars, OAuth wiring, commerce fetchers,
cart store, hosting), see [Client Sites — Integration Pattern](/domains/client-sites/).

## What it is

A musician's site (`name: "camo"`, store slug `camo`): merch store, music page with a
Spotify embedded player, shows/tour list, about/press photos. Content like bio,
releases, and shows is static JSON in `src/content/`. It is the **reference
implementation** of the authed storefront pattern — `nayadnara` is a fork of it.

## Deltas from the canonical pattern

- **Cart UI:** uses a slide-out `cart-drawer.tsx` (a `sheet.tsx` primitive) plus
  `cart-count.tsx`; nayadnara renamed these to `cart-panel`/`cart-icon`.
- **Cart store:** the original (no per-mutation `loading` guards — nayadnara added
  those later; see Findings F-018).
- **Merch drops:** `drop-overlay.tsx` + `countdown-timer.tsx` gate products by a
  `goesLiveAt` timestamp (`isLive()` check on the merch list) — a feature absent
  from nayadnara.
- **Login/callback:** plain `next` query handling (no `safe-next` sanitizer that
  nayadnara added), and the callback eagerly `fetchCart()`s after login.

## Site-specific notes

- **Vercel artifacts:** the only site with a committed `vercel.json`
  (`installCommand: pnpm install --ignore-scripts`); a `.vercel/` project link
  exists locally but is gitignored (not committed).
- **Vendored SDK:** `@sitehaus/client-sdk` is installed from
  `vendor/sitehaus-client-sdk-0.4.0.tgz` (a local file, not the npm registry — see
  Findings F-020). The tarball is byte-identical to nayadnara's.
- **Image hosts:** `next.config.ts` allow-lists R2 CDNs and `i.scdn.co` (Spotify).
- Ships both a `package-lock.json` and a `pnpm-lock.yaml` (npm + pnpm lockfiles
  coexist).
