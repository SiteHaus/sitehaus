---
title: Client Site — onehealthclinics
description: SEO-heavy medical clinic site with an anonymous commerce shop via a same-origin proxy.
---

For the shared integration pattern, see
[Client Sites — Integration Pattern](/domains/client-sites/). onehealthclinics
shares the *shape* of that pattern but **none of the code** of camo-web/nayadnara —
it is an independent codebase.

## What it is

A primary-care clinic site in St. George, Utah. Mostly informational/SEO content
(home, about, pediatrics, services with per-service sub-pages, contact) plus a
small **vitamins shop** (`/shop`) backed by the SiteHaus commerce gateway. Unlike
the music sites, there is **no IAM login and no customer accounts** — shopping is
fully anonymous.

## Deltas from the canonical pattern

- **Anonymous commerce:** no `@sitehaus/client-sdk`, no OAuth, no `Authorization`
  header. Cart identity is the commerce `store_session` cookie alone.
- **Same-origin `/api/ecom` proxy:** the commerce client (`lib/ecom/client.ts`)
  calls the gateway **directly during SSR/RSC** but routes **browser** calls through
  a Next rewrite `"/api/ecom/:path*" → ${NEXT_PUBLIC_ECOM_API_URL}/:path*`. This
  keeps the session cookie first-party — iOS Safari ITP blocks the cross-site cookie
  the music sites rely on. (Documented in code; the reason camo-web/nayadnara would
  break cart on mobile.)
- **Named helpers, plain errors:** exports `getProducts`/`getProduct`/`getCart`/
  `addToCart`/`updateCartItem`/`removeCartItem`/`createCheckoutIntent`/`getOrder`
  and throws plain `Error` (parses `{message}` from the body) — not the generic
  `publicFetch`/`commerceFetch` + `CommerceError` of the music sites.
- **Cart state:** local React `useState` inside `app/shop/ShopClient.tsx` (no
  Zustand store). `/shop/checkout` is a stub that `redirect("/shop")`;
  `/shop/order-confirmation` reads `orderId` from the query string.
- **Different env var:** commerce base URL is `NEXT_PUBLIC_ECOM_API_URL` (not
  `NEXT_PUBLIC_COMMERCE_URL`).

## Site-specific notes

- **middleware.ts:** redirects `www.*` → apex with a 301 (the only site with
  middleware).
- **SEO-attentive:** rich `metadata`/OpenGraph/Twitter in `app/layout.tsx`,
  a hand-built `sitemap.ts` with per-route priorities, `robots.ts`, legacy-URL
  `redirects()` in `next.config.ts` (e.g. `/contact-us`→`/contact`,
  `/vitamins`→`/shop`), and **Pagefind** static search built in the `build` script
  (`next build && npx pagefind …`) wired into `NavbarSearch.tsx`. A committed
  Search-Console export (`onehealthclinics.com-Performance-on-Search-2026-06-08.zip`)
  sits in the repo root — an SEO working artifact, not code.
- **Integrations:** Cloudflare Turnstile + Resend on the contact form
  (`app/contact/actions.ts`); a live **Google Reviews** widget
  (`components/google-reviews.tsx`) using `GOOGLE_PLACES_API_KEY` / `GOOGLE_PLACE_ID`.
- **Secrets in local env:** the un-tracked `.env` holds real Turnstile and Google
  Places keys. It is `.gitignore`d (not committed), but the live secrets sit in a
  plaintext working file — see Findings F-021.
- **MDX:** `pageExtensions` includes `md`/`mdx` (`rehype-slug`), unused by the music
  sites.
