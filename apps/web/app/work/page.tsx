import type { Metadata } from "next";
import Link from "next/link";
import { MoveRight, Lock } from "lucide-react";
import { JsonLd } from "../components/json-ld";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Case studies from SiteHaus — real projects, real results. See how we approach migrations, ecommerce, SEO, and software for clients who need more than a vendor.",
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work | SiteHaus",
    description:
      "Case studies from SiteHaus — real projects, real results. See how we approach migrations, ecommerce, SEO, and software for clients who need more than a vendor.",
    url: "/work",
  },
};

const caseStudies = [
  {
    href: "/work/onehealth",
    client: "OneHealth Clinics",
    location: "St. George, UT",
    tags: ["Migration", "Ecommerce", "SEO", "UX", "Web"],
    headline:
      "WordPress migration, a full ecommerce platform, and 13,000+ monthly search impressions.",
    description:
      "OneHealth Clinics needed everything — a modern site, a way to sell products to patients, and better local search visibility. We migrated them off WordPress, built their storefront on SiteHaus Commerce, and did a complete SEO and UX overhaul in a single continuous engagement.",
    stats: [
      { value: "13k+", label: "Monthly impressions" },
      { value: "5", label: "New service pages" },
      { value: "32", label: "Commerce DB tables" },
    ],
  },
];

const platformTeaser = {
  name: "SiteHaus Commerce",
  tagline: "White-label ecommerce infrastructure for every client.",
  description:
    "We built our own commerce platform from scratch — NestJS microservices, PostgreSQL, BullMQ workers, Stripe Connect, and real-time inventory reservations. It powers OneHealth's storefront and is available to any SiteHaus client. No platform fees. No lock-in.",
  tags: ["Platform", "Ecommerce", "API"],
  specs: [
    "NestJS microservices over TCP",
    "32-table PostgreSQL schema",
    "BullMQ + Redis async workers",
    "Stripe Connect — zero platform fees",
    "Cloudflare R2 image storage",
    "Full order lifecycle + returns",
  ],
};

export default function WorkPage() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Work | SiteHaus",
            url: "https://sitehaus.dev/work",
            description: "Case studies from SiteHaus.",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://sitehaus.dev" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Work",
                item: "https://sitehaus.dev/work",
              },
            ],
          },
        ]}
      />

      {/* Hero */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-36 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Our work
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Real projects.{" "}
            <span className="italic font-bold text-foreground/40">Real results.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            We don't do spec work or mock portfolios. Every case study here is a live client,
            shipped code, and measurable outcomes.
          </p>
        </div>
      </section>

      {/* Case studies */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-5xl flex flex-col gap-6">
          {caseStudies.map((cs) => (
            <Link
              key={cs.href}
              href={cs.href}
              className="group block rounded-2xl border border-border/60 bg-card/40 p-8 md:p-10 hover:border-border transition-colors"
              style={{ textDecoration: "none" }}
            >
              {/* Tags + meta */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="text-sm font-semibold" style={{ color: "var(--ink-900)" }}>
                  {cs.client}
                </span>
                <span className="text-xs text-muted-foreground">· {cs.location}</span>
                {cs.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
                    style={{
                      background: "var(--parchment-200)",
                      color: "var(--clay-700)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Headline */}
              <p
                className="text-xl md:text-2xl font-bold leading-snug tracking-tight mb-3"
                style={{ color: "var(--ink-900)" }}
              >
                {cs.headline}
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm mb-7">{cs.description}</p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-4 mb-6">
                {cs.stats.map(({ value, label }) => (
                  <div
                    key={label}
                    className="flex flex-col rounded-xl px-5 py-3"
                    style={{
                      background: "var(--parchment-100)",
                      border: "1px solid var(--line-soft)",
                    }}
                  >
                    <span
                      className="font-bold leading-none"
                      style={{
                        fontFamily: "var(--font-display)",
                        fontVariationSettings: "'opsz' 48, 'SOFT' 20, 'WONK' 0",
                        fontSize: "26px",
                        color: "var(--terracotta-500)",
                      }}
                    >
                      {value}
                    </span>
                    <span
                      className="text-[11px] font-semibold uppercase tracking-widest mt-1"
                      style={{ color: "var(--clay-500)" }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="inline-flex items-center gap-2 text-sm font-semibold"
                style={{ color: "var(--terracotta-500)" }}
              >
                Read case study{" "}
                <MoveRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Platform Teaser */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-5xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-8">
            Also in production
          </p>
          <div className="rounded-2xl p-8 md:p-10" style={{ background: "var(--clay-900)" }}>
            <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {platformTeaser.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{
                        background: "rgba(221, 138, 102, 0.15)",
                        color: "var(--terracotta-300)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2
                  className="text-2xl md:text-3xl font-bold tracking-tight mb-2"
                  style={{ color: "var(--parchment-50)" }}
                >
                  {platformTeaser.name}
                </h2>
                <p
                  className="text-base font-medium"
                  style={{
                    color: "var(--terracotta-300)",
                    fontStyle: "italic",
                    fontFamily: "var(--font-display)",
                    fontVariationSettings: "'opsz' 36, 'SOFT' 80, 'WONK' 1",
                  }}
                >
                  {platformTeaser.tagline}
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  color: "var(--parchment-300)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <Lock className="h-3 w-3" /> Case study coming soon
              </div>
            </div>

            <p
              className="text-sm leading-relaxed max-w-2xl mb-8"
              style={{ color: "var(--parchment-200)" }}
            >
              {platformTeaser.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {platformTeaser.specs.map((spec) => (
                <div
                  key={spec}
                  className="flex items-center gap-2.5 text-sm"
                  style={{ color: "var(--parchment-300)" }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: "var(--terracotta-500)" }}
                  />
                  {spec}
                </div>
              ))}
            </div>
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
            Want results like these?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            We work with a small number of clients at a time so we can actually care about the
            outcome. Tell us about your project.
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
