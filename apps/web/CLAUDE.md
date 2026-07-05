# Web App (Marketing Site)

Next.js 15 public marketing site. Port 3000. No auth dependency.

## Key Points

- Server components by default — no `"use client"` unless truly needed for interactivity
- No React Query — data fetching in server components or `generateStaticParams`
- SEO is a priority: `generateMetadata`, structured data, `sitemap.ts`, `robots.ts` already wired
- shadcn/ui components from `@site-haus/ui`; Tailwind CSS 4.x

## Structure

```
app/
  page.tsx          ← homepage
  about/
  services/
  work/             ← case studies
  our-method/
  platform/
  contact/
  components/       ← shared site-wide components
```

No `"use client"` in layout files. Keep bundle size minimal — this is a public marketing site, not an app.
