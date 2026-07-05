---
title: Client Site — nayadnara
description: Musician merch + music storefront; a fork of camo-web with incremental hardening.
---

For the shared integration pattern (env vars, OAuth wiring, commerce fetchers,
cart store, hosting), see [Client Sites — Integration Pattern](/domains/client-sites/).

## What it is

A musician's site (`name: "nayadnara"`, store slug `nayadnara`): merch store, music
page, shows, press, and a working contact form. Structurally it is a **fork of
camo-web** — the commerce client, types, auth pages, cart store, and merch
components are the same files with small edits (see Findings F-018). It is the
slightly *newer/hardened* of the two clones.

## Deltas from the canonical pattern

- **safe-next sanitizer:** adds `src/lib/safe-next.ts` and routes every post-login
  redirect (`login`, `callback`) through `safeNext()` to reject open-redirect
  targets — camo-web does not have this.
- **Cart store hardening:** `cart-store.ts` wraps `addItem`/`removeItem`/`updateItem`
  in `set({ loading: true })` … `finally { set({ loading: false }) }`; camo-web's
  versions don't toggle loading on mutation.
- **RequireAuth:** renders an explicit `LOADING…` screen while unauthenticated
  instead of camo-web's dimmed-opacity wrapper (same file, different body).
- **providers.tsx:** lazily constructs the `QueryClient` via `useState(() => …)` and
  fetches the cart in an effect when `user` becomes available (camo-web does it in
  the callback).
- **Cart UI:** `cart/cart-panel.tsx` + `cart/cart-icon.tsx` (camo-web names them
  `cart-drawer`/`cart-count`).
- No merch "drop"/countdown feature (camo-web-only).

## Site-specific notes

- **Contact form:** `src/app/contact/` posts to a server action
  (`actions.ts`) that verifies Cloudflare **Turnstile** and sends mail via
  **Resend** (`@marsidev/react-turnstile`, `resend` deps). Requires `RESEND_API_KEY`,
  `CONTACT_EMAIL`, `TURNSTILE_*`.
- **React Compiler:** `next.config.ts` sets `reactCompiler: true`
  (`babel-plugin-react-compiler` dev dep) — the only site that enables it.
- **Vendored SDK:** same locally-vendored `vendor/sitehaus-client-sdk-0.4.0.tgz` as
  camo-web (byte-identical; Findings F-020).
- Has a `pnpm-workspace.yaml` declaring `ignoredBuiltDependencies` (sharp,
  unrs-resolver) and both npm + pnpm lockfiles.
