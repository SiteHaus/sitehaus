---
title: Client Sites — Integration Pattern
description: How a SiteHaus client storefront is built — separate Next.js repos consuming the shared IAM and commerce APIs.
---

## Overview

Client sites are the public-facing websites SiteHaus builds for individual clients.
Each is its **own repository and its own deploy** (Vercel) — they are not apps in the
`sitehaus` monorepo. They consume the shared platform: the commerce gateway
(`sitehaus-commerce`, :7020) for catalog/cart/checkout, and optionally the IAM API
(`sitehaus`, :3003) for customer login. There are two archetypes:

- **Authed storefronts** — `camo-web` and `nayadnara`. Customers log in via OAuth2
  PKCE against IAM using `@sitehaus/client-sdk/frontend`; the access token is attached
  to commerce calls. Cart is per-user, gated behind login.
- **Anonymous storefront** — `onehealthclinics`. No IAM, no login. It talks to the
  commerce gateway anonymously, routing browser calls through a same-origin
  `/api/ecom` proxy so the commerce `store_session` cookie stays first-party.

All three are Next.js 16 + React 19 + Tailwind 4 apps. The two music-merch sites
(`camo-web`, `nayadnara`) are near-clones of each other (see
[Findings](/findings/) F-001, F-008, F-018, F-019); `onehealthclinics` is an
independent codebase that shares the integration *shape* but none of the code.

## The canonical storefront integration

### Env / config

The vars that wire a site to the platform (`.env.local.example`):

| Var | Sites | Purpose |
| --- | ----- | ------- |
| `NEXT_PUBLIC_COMMERCE_URL` | camo-web, nayadnara | Commerce gateway base URL (e.g. `https://commerce-api.sitehaus.dev`) |
| `NEXT_PUBLIC_ECOM_API_URL` | onehealthclinics | Commerce gateway base URL (different var name; also used as the `/api/ecom` rewrite target) |
| `NEXT_PUBLIC_STORE_SLUG` | all three | Tenant slug sent as the `x-store-slug` header (`camo`, `nayadnara`, `onehealthclinics`) |
| `NEXT_PUBLIC_API_URL` | camo-web, nayadnara | IAM API base URL for OAuth (`/auth/authorize`, `/auth/token`) |
| `NEXT_PUBLIC_CLIENT_KEY` | camo-web, nayadnara | IAM OAuth client key (`camo`, `nayadnara`) — registered in the SiteHaus dashboard |
| `RESEND_API_KEY`, `CONTACT_EMAIL` | nayadnara, onehealthclinics | Server-side contact-form email (Resend) |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | nayadnara, onehealthclinics | Cloudflare Turnstile on the contact form |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | onehealthclinics | Live Google Reviews widget |

### Auth wiring (camo-web, nayadnara)

Both authed sites wrap `@sitehaus/client-sdk/frontend` in an identical file layout
(see the [Identity sweep](/domains/identity/) for the SDK internals and the
end-to-end OAuth flow):

- `src/app/providers.tsx` — calls `initStoresSdk({ baseURL, clientKey, proactiveRefreshSkewSec: 60 })`
  at module load, wraps the app in a React Query `QueryClientProvider`
  (`staleTime: 30_000, retry: 1, refetchOnWindowFocus: false`), and on every
  navigation (except `/callback`) and on tab `visibilitychange` calls
  `useAuthStore.getState().bootstrap()` to silently refresh the token from the
  per-client `sh_refresh_<key>` cookie.
- `src/app/login/page.tsx` — `generatePKCE()` + `generateState()`, stashes the
  verifier/state/`next` in `sessionStorage`, then redirects to
  `buildAuthorizationUrl({ authUrl: ${API_URL}/auth/authorize, clientKey, redirectUri: ${origin}/callback, codeChallenge, state, scope: "openid profile" })`.
- `src/app/callback/page.tsx` — verifies `state`, calls
  `exchangeCodeForTokens({ tokenUrl: ${API_URL}/auth/token, code, codeVerifier, clientKey, redirectUri })`,
  writes the token to `useAuthStore.setAccess({ accessToken, accessExpiration: Date.now() + expires_in*1000 })`,
  loads the user with `useAuthStore.me()`, then `router.replace(next)`.
- `RequireAuth` (`camo-web:src/components/ui/require-auth.tsx`,
  `nayadnara:src/components/require-auth.tsx`) — reads `bootstrapped` + `user`
  from the store and gates children until both are present.

> Note: the access token is stored **in JS memory only** (Zustand, no persist) and
> the expiry is computed in **milliseconds** here — the sitehaus `auth-store` /
> dashboard compute it in seconds (Findings F-005).

### Commerce client

`src/lib/commerce.ts` (camo-web / nayadnara) exports two fetchers and a
`CommerceError` class:

- `publicFetch<T>(path, init)` — for server components / unauthenticated public
  reads (catalog). Sends `Content-Type: application/json` + `x-store-slug`. Throws
  `CommerceError(status)` on non-2xx.
- `commerceFetch<T>(path, init)` — for authenticated calls (cart, checkout,
  orders). Reads the access token from `useAuthStore.getState().accessToken`,
  attaches `Authorization: Bearer …`, sends `credentials: "include"`. **On 401 in
  the browser it hard-redirects to `/login?next=<current path>`** before throwing.

`onehealthclinics` does the same job with a different file (`lib/ecom/client.ts`):
no auth header, no SDK, throws plain `Error`, and exports **named endpoint helpers**
(`getProducts`, `getProduct`, `getCart`, `addToCart`, `updateCartItem`,
`removeCartItem`, `createCheckoutIntent`, `getOrder`) instead of generic fetchers.
Critically, in the browser it points `API_URL` at the same-origin `/api/ecom`
proxy; on the server it calls the gateway directly. See
[onehealthclinics](/domains/client-sites/onehealthclinics/).

### Cart flow

- **camo-web / nayadnara** — a Zustand store `src/lib/cart-store.ts`
  (`items`, `itemCount`, `subtotalCents`, `loading`) with `fetchCart` / `addItem` /
  `removeItem` / `updateItem`, each calling `commerceFetch` against `/v1/cart*` then
  re-fetching. UI: camo-web uses a `cart-drawer.tsx` (sheet) + `cart-count.tsx`;
  nayadnara uses `cart-panel.tsx` + `cart-icon.tsx`. Checkout posts to
  `/v1/checkout/intent` with `successUrl`/`cancelUrl` and redirects the browser to
  the returned `checkoutUrl` (Stripe Checkout hosted on the connected account).
- **onehealthclinics** — no global store; cart lives in local React `useState`
  inside `ShopClient.tsx`, hydrated from `getCart()` (the commerce `store_session`
  cookie is the source of truth). Checkout calls `createCheckoutIntent`. The
  `/shop/checkout` route is currently a stub that `redirect("/shop")`.

### Hosting / deploy

All three deploy on **Vercel** (verified from `create-next-app` READMEs and, for
camo-web, a committed `.vercel/` project link + `vercel.json`). Per-site config:

- **camo-web** — `vercel.json` sets `installCommand: pnpm install --ignore-scripts`;
  `next.config.ts` allow-lists R2 (`*.r2.dev`, `*.r2.cloudflarestorage.com`) and
  Spotify (`i.scdn.co`) image hosts.
- **nayadnara** — no `vercel.json` (defaults); `next.config.ts` enables
  `reactCompiler: true` (with `babel-plugin-react-compiler`).
- **onehealthclinics** — no `vercel.json`; `next.config.ts` defines the
  `/api/ecom/:path*` rewrite, several legacy-URL `redirects()`, and R2 CDN +
  legacy WordPress image hosts. Build runs Pagefind after `next build` for static
  search.

## Site comparison

| Aspect | camo-web | nayadnara | onehealthclinics |
| ------ | -------- | --------- | ---------------- |
| What it is | Musician merch + music/shows site | Musician merch + music/shows site | Medical clinic site (St. George, UT) with a vitamins shop |
| Auth model | IAM OAuth PKCE (`@sitehaus/client-sdk/frontend`) | Same as camo-web | **Anonymous** — no IAM, no login |
| Commerce client | `src/lib/commerce.ts` generic `publicFetch`/`commerceFetch` | Same file (≈identical) | `lib/ecom/client.ts` named helpers, plain `Error`, via `/api/ecom` proxy |
| Cart state | Zustand `cart-store.ts` | Zustand `cart-store.ts` (adds loading guards) | Local `useState` in `ShopClient` |
| Commerce base var | `NEXT_PUBLIC_COMMERCE_URL` | `NEXT_PUBLIC_COMMERCE_URL` | `NEXT_PUBLIC_ECOM_API_URL` |
| Client SDK | vendored `vendor/sitehaus-client-sdk-0.4.0.tgz` | vendored (byte-identical tgz) | none |
| Framework | Next 16.2.4, React 19.2.4 | Next 16.2.4, React 19.2.4, React Compiler | Next 16.1.6, React 19.2.3 |
| Notable extras | `.vercel/`, `vercel.json`, Spotify embed | Contact form (Resend + Turnstile), `safe-next` | `middleware.ts` (www→apex 301), Pagefind search, Turnstile, Google Reviews, MDX, heavy SEO |
| Hosting | Vercel (`.vercel/` + `vercel.json`) | Vercel | Vercel |
