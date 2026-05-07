import type { Metadata } from "next";
import Link from "next/link";
import { MoveRight, ArrowLeft } from "lucide-react";
import { JsonLd } from "../../components/json-ld";

export const metadata: Metadata = {
  title: "OneHealth Clinics — Case Study",
  description:
    "How SiteHaus migrated OneHealth Clinics off WordPress, built a full ecommerce storefront, and drove 13,000+ monthly search impressions through a complete SEO and UX overhaul.",
  alternates: { canonical: "/work/onehealth" },
  openGraph: {
    title: "OneHealth Clinics Case Study | SiteHaus",
    description:
      "WordPress migration, full site buildout, white-label ecommerce platform, and 13,000+ monthly impressions. A complete digital transformation for a Southern Utah primary care clinic.",
    url: "/work/onehealth",
  },
  twitter: {
    title: "OneHealth Clinics Case Study | SiteHaus",
    description:
      "WordPress migration, full site buildout, white-label ecommerce platform, and 13,000+ monthly impressions. A complete digital transformation for a Southern Utah primary care clinic.",
    images: ["/og.png"],
  },
  keywords: [
    "WordPress migration case study",
    "healthcare website development Utah",
    "SEO improvement results",
    "ecommerce medical clinic",
  ],
};

const migrationItems = [
  {
    label: "WordPress → Next.js 15",
    detail:
      "Migrated off a slow, hard-to-maintain WordPress install onto a modern Next.js App Router stack — faster builds, better DX, full TypeScript.",
  },
  {
    label: "Content architecture",
    detail:
      "Rebuilt the full page structure from scratch: home, services (with individual specialty sub-pages), pediatrics, about, contact, and shop — all with proper metadata and layout hierarchy.",
  },
  {
    label: "SEO equity preserved",
    detail:
      "All old WordPress URLs mapped to new routes with 301 redirects, including legacy traffic still hitting dead paths like /contact-us and /specialty-services.",
  },
  {
    label: "Design system",
    detail:
      "Built a cohesive design system using Tailwind CSS and shadcn/ui with a custom teal/parchment palette, consistent typography, and reusable components across all pages.",
  },
];

const commerceItems = [
  {
    label: "Full product catalog",
    detail:
      "Products with multi-variant support (size, format, dosage), option groups, image management via Cloudflare R2, and dynamic collections.",
  },
  {
    label: "Real-time inventory",
    detail:
      "Inventory reservations with Redis-backed TTL expiry on carts — stock is held when a customer adds to cart and released if they abandon checkout. No overselling.",
  },
  {
    label: "Stripe Connect payments",
    detail:
      "Revenue routes directly into OneHealth's Stripe account. SiteHaus takes zero platform fee. Includes Stripe Tax API for automatic tax calculation.",
  },
  {
    label: "Order lifecycle",
    detail:
      "Full order management from pending through confirmed, shipped, and delivered — with return and refund handling built in from day one.",
  },
  {
    label: "Async email workers",
    detail:
      "BullMQ + Redis worker processes handle order confirmations, shipping updates, and inventory alerts asynchronously — no blocking the request path.",
  },
  {
    label: "Admin dashboard",
    detail:
      "Staff can manage products, variants, inventory levels, orders, discount codes, shipping zones, and collections — all without touching code.",
  },
];

const seoItems = [
  {
    label: "Geo-targeted titles",
    detail:
      "Updated every page title to include St. George, UT — the single fastest lever for local healthcare search ranking.",
  },
  {
    label: "5 specialty service pages",
    detail:
      "Weight Loss, Hormone Therapy, NAD+ Infusions, Vitamin Infusions, and PRP Injections each got a dedicated page so Google can rank them independently.",
  },
  {
    label: "7 physician schemas",
    detail:
      "Added Schema.org Physician structured data for all 7 providers on the About page, targeting doctor name searches directly.",
  },
  {
    label: "Legacy brand capture",
    detail:
      "329 monthly searches for their former name were going nowhere. Added the Dixie Primary Care reference to hero copy and meta descriptions to capture them.",
  },
];

const uxItems = [
  {
    label: "Services mega menu",
    detail:
      "Rebuilt the desktop nav into a two-column mega menu — Clinic Services and Specialty Services with descriptions, replacing a flat link list.",
  },
  {
    label: "Mobile nav overhaul",
    detail:
      "Replaced a 12-item expanded services list with clean top-level links, larger touch targets, and a Book Appointment CTA in the hamburger menu.",
  },
  {
    label: "Scrollable quick-nav",
    detail:
      "Quick-nav pill strips on Services, Pediatrics, and About were consuming 200px of mobile viewport. Replaced with a swipeable horizontal scroll using shadcn ScrollArea.",
  },
  {
    label: "Friction fixes",
    detail:
      "Phone number made tappable via tel: link. Footer Book Appointment button was routing nowhere — fixed. Book Appointment CTA added to the persistent navbar.",
  },
];

export default function OneHealthCaseStudy() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "OneHealth Clinics — Full Digital Transformation Case Study",
            url: "https://sitehaus.dev/work/onehealth",
            author: { "@type": "Organization", name: "SiteHaus", url: "https://sitehaus.dev" },
            publisher: { "@type": "Organization", name: "SiteHaus", url: "https://sitehaus.dev" },
            description:
              "How SiteHaus migrated OneHealth off WordPress, built a white-label ecommerce platform, and drove 13,000+ monthly search impressions.",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://sitehaus.dev" },
              { "@type": "ListItem", position: 2, name: "Work", item: "https://sitehaus.dev/work" },
              {
                "@type": "ListItem",
                position: 3,
                name: "OneHealth Clinics",
                item: "https://sitehaus.dev/work/onehealth",
              },
            ],
          },
        ]}
      />

      {/* Hero */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-36 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <Link
            href="/work"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
            style={{ textDecoration: "none" }}
          >
            <ArrowLeft className="h-4 w-4" /> All work
          </Link>

          <div className="flex flex-wrap gap-2 mb-5">
            {["Migration", "Ecommerce", "SEO", "UX", "Web"].map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
                style={{ background: "var(--parchment-200)", color: "var(--clay-700)" }}
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4">
            OneHealth Clinics
          </h1>
          <p
            className="text-xl md:text-2xl leading-relaxed mb-10"
            style={{
              color: "var(--clay-500)",
              fontStyle: "italic",
              fontFamily: "var(--font-display)",
              fontVariationSettings: "'opsz' 36, 'SOFT' 80, 'WONK' 1",
            }}
          >
            They came to us on a slow WordPress install with a WooCommerce store that wasn't cutting
            it and almost no local search visibility. We rebuilt everything.
          </p>

          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { stat: "13k+", label: "Monthly impressions" },
              { stat: "5", label: "New service pages" },
              { stat: "7", label: "Physician schemas" },
              { stat: "32", label: "Commerce DB tables" },
            ].map(({ stat, label }) => (
              <div
                key={label}
                className="rounded-xl p-5 flex flex-col gap-1"
                style={{
                  background: "var(--parchment-100)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                <span
                  className="font-bold leading-none"
                  style={{
                    fontFamily: "var(--font-display)",
                    fontVariationSettings: "'opsz' 72, 'SOFT' 20, 'WONK' 0",
                    fontSize: "36px",
                    color: "var(--terracotta-500)",
                  }}
                >
                  {stat}
                </span>
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--clay-500)" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 max-w-5xl">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
                The client
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6">
                Primary care for every stage of life.
              </h2>
            </div>
            <div className="flex flex-col gap-5 text-muted-foreground leading-relaxed">
              <p>
                OneHealth Clinics is a comprehensive primary care and specialty clinic in St.
                George, Utah. Seven providers spanning internal medicine, family medicine,
                pediatrics, dermatology, and women's health — serving patients from newborn through
                senior years, all under one roof.
              </p>
              <p>
                When they came to us, they were running a slow WordPress site with a WooCommerce
                store nobody could get useful data out of — and no internal team to fix any of it.
                We became their full digital partner and long-term technical team. Migration,
                buildout, ecommerce, and SEO — and we're still the ones keeping the lights on.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Challenge */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            The challenge
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-10 max-w-2xl">
            A practice that outgrew its website.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Legacy WordPress stack",
                body: "The existing site was slow, hard to update, and gave the team no real control over content or design. A modern practice deserved a modern foundation.",
              },
              {
                title: "WooCommerce wasn't cutting it",
                body: "They had a WooCommerce store, but it was slow, hard to use, and gave them no visibility into the data that actually mattered — sales trends, inventory, order status. It was there, but it wasn't working for them.",
              },
              {
                title: "Invisible to local search",
                body: "With 13,000+ monthly impressions, Google was already finding them — but poor titles, zero structured data, and no individual service pages meant almost none of those impressions converted to clicks.",
              },
            ].map(({ title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/60 bg-card/40 p-7 flex flex-col gap-3"
              >
                <p className="font-bold text-base" style={{ color: "var(--ink-900)" }}>
                  {title}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Migration & Buildout */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="text-xs font-semibold tracking-[0.25em] uppercase"
              style={{ color: "var(--terracotta-500)" }}
            >
              01
            </div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
              Migration & buildout
            </p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-4 max-w-2xl">
            Off WordPress. Onto something they could actually own.
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
            We rebuilt the entire site from scratch on Next.js 15 with Tailwind CSS and shadcn/ui —
            a stack built to last — maintainable, extensible, and fully in SiteHaus's hands. Every
            page was designed with their brand, their patients, and their search rankings in mind.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {migrationItems.map(({ label, detail }) => (
              <div
                key={label}
                className="rounded-xl p-5 flex flex-col gap-2"
                style={{
                  background: "var(--parchment-100)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--ink-900)" }}>
                  {label}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Commerce Platform */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="text-xs font-semibold tracking-[0.25em] uppercase"
              style={{ color: "var(--terracotta-500)" }}
            >
              02
            </div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
              Ecommerce platform
            </p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-4 max-w-2xl">
            A full commerce platform. Built once, available to every client.
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mb-6">
            Rather than bolt on a third-party plugin, we built SiteHaus Commerce — a white-label
            ecommerce API that powers OneHealth's storefront and is available to any of our clients.
            NestJS microservices, PostgreSQL with 32 tables, BullMQ workers, and Stripe Connect so
            payments flow directly to the client with zero platform fees.
          </p>

          {/* Architecture callout */}
          <div
            className="rounded-2xl p-6 mb-8 flex flex-col gap-2"
            style={{
              background: "var(--clay-900)",
              color: "var(--parchment-100)",
            }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-1"
              style={{ color: "var(--terracotta-300)" }}
            >
              Architecture
            </p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--parchment-200)" }}>
              Three independent processes over a single database: a public-facing Gateway, a
              Commerce microservice (catalog, cart, orders, inventory), and a Payments microservice
              (Stripe keys, webhooks, refunds) — communicated via NestJS TCP. A fourth BullMQ Worker
              process handles async jobs — order emails, inventory expiry — without touching the
              request path. Stripe keys never leave the Payments service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {commerceItems.map(({ label, detail }) => (
              <div
                key={label}
                className="rounded-xl p-5 flex flex-col gap-2"
                style={{
                  background: "var(--parchment-100)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                <p className="text-sm font-semibold" style={{ color: "var(--ink-900)" }}>
                  {label}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEO & UX */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="text-xs font-semibold tracking-[0.25em] uppercase"
              style={{ color: "var(--terracotta-500)" }}
            >
              03
            </div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
              SEO & UX
            </p>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-4 max-w-2xl">
            13,000 impressions were already happening. We made them count.
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mb-10">
            A Google Search Console audit revealed a strong impression base with poor click-through
            — outdated titles, no structured data, a mobile experience with real friction. We fixed
            all of it in a single sprint.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* SEO */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--terracotta-500)" }}
                />
                <h3 className="text-base font-bold" style={{ color: "var(--ink-900)" }}>
                  Search visibility
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {seoItems.map(({ label, detail }) => (
                  <div
                    key={label}
                    className="rounded-xl p-5 flex flex-col gap-1.5"
                    style={{
                      background: "var(--parchment-100)",
                      border: "1px solid var(--line-soft)",
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--ink-900)" }}>
                      {label}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* UX */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--terracotta-500)" }}
                />
                <h3 className="text-base font-bold" style={{ color: "var(--ink-900)" }}>
                  User experience
                </h3>
              </div>
              <div className="flex flex-col gap-3">
                {uxItems.map(({ label, detail }) => (
                  <div
                    key={label}
                    className="rounded-xl p-5 flex flex-col gap-1.5"
                    style={{
                      background: "var(--parchment-100)",
                      border: "1px solid var(--line-soft)",
                    }}
                  >
                    <p className="text-sm font-semibold" style={{ color: "var(--ink-900)" }}>
                      {label}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Results
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6 max-w-2xl">
            A practice patients can actually find — and that can sell.
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-2xl mb-8">
            OneHealth went from a slow WordPress site and a WooCommerce store that wasn't working
            for them to a fully custom web presence. The SEO changes — new service pages, physician
            schemas, geo-targeted titles — take 4–8 weeks to fully index. We'll update this page
            with ranking data as it comes in.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {[
              {
                label: "Live now",
                items: [
                  "Full site migrated off WordPress",
                  "Ecommerce storefront live and selling",
                  "7 physician schemas indexed",
                  "5 specialty service pages launched",
                  "301 redirects preserving SEO equity",
                ],
              },
              {
                label: "Indexing (check back June 2025)",
                items: [
                  "Weight loss medication St. George rankings",
                  "Hormone replacement therapy Utah rankings",
                  "Individual physician name search positions",
                  "About page position improvement (currently p.16)",
                  "Specialty service page organic entries",
                ],
              },
            ].map(({ label, items }) => (
              <div
                key={label}
                className="rounded-2xl border border-border/60 bg-card/40 p-7 flex flex-col gap-4"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <ul className="flex flex-col gap-2">
                  {items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
                    >
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: "var(--terracotta-500)" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-6 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Work with us
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
            Want us to do this for your site?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Tell us where you are and we'll be straight about what we'd do.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 font-semibold px-6 py-3 rounded-full transition-all"
            style={{
              background: "var(--terracotta-500)",
              color: "var(--parchment-50)",
              textDecoration: "none",
            }}
          >
            Start a conversation <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
