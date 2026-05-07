import type { Metadata } from "next";
import { Globe, MoveRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../../components/json-ld";

export const metadata: Metadata = {
  title: "WordPress to Next.js Migration Service",
  description:
    "Migrate off WordPress to a fast, maintainable Next.js site. We handle the full migration — content, SEO equity, redirects, and design — for Utah businesses and beyond.",
  alternates: { canonical: "/services/wordpress-migration" },
  openGraph: {
    title: "WordPress to Next.js Migration Service | SiteHaus",
    description:
      "Migrate off WordPress to a fast, maintainable Next.js site. We handle the full migration — content, SEO equity, redirects, and design.",
    url: "/services/wordpress-migration",
  },
  twitter: {
    title: "WordPress to Next.js Migration Service | SiteHaus",
    description:
      "Migrate off WordPress to a fast, maintainable Next.js site. We handle the full migration — content, SEO equity, redirects, and design.",
  },
  keywords: [
    "WordPress to Next.js migration",
    "WordPress migration service Utah",
    "headless CMS Utah",
    "migrate from WordPress",
  ],
};

export default function WordPressMigrationPage() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "WordPress to Next.js Migration",
            provider: { "@type": "Organization", name: "SiteHaus", url: "https://sitehaus.dev" },
            description:
              "Full WordPress to Next.js migration — content, SEO equity, redirects, and design rebuilt from scratch.",
            areaServed: ["Ogden, Utah", "Salt Lake City, Utah", "St. George, Utah"],
            serviceType: "WordPress Migration",
            url: "https://sitehaus.dev/services/wordpress-migration",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://sitehaus.dev" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Services",
                item: "https://sitehaus.dev/services",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: "WordPress Migration",
                item: "https://sitehaus.dev/services/wordpress-migration",
              },
            ],
          },
        ]}
      />

      {/* Breadcrumb */}
      <div className="container mx-auto px-6 pt-4 pb-0">
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Services
        </Link>
      </div>

      {/* Hero */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-32 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex items-center gap-3 mb-5">
            <Globe className="h-6 w-6 text-primary/70" aria-hidden="true" />
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
              WordPress Migration
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            WordPress to Next.js{" "}
            <span className="italic font-bold text-foreground/50">Migration.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-8">
            Done with slow load times, plugin conflicts, and security patches? We migrate WordPress
            sites to modern Next.js — preserving your SEO equity, rebuilding your design, and
            handing you something you actually own.
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
            Get a migration quote <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* What's included */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-8">
            What&rsquo;s included
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Full content migration",
              "301 redirects for every old URL",
              "SEO equity preservation",
              "Design rebuilt in Next.js + Tailwind",
              "Faster Core Web Vitals",
              "Zero WordPress dependencies after launch",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/60 bg-card/40 text-sm"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case study callout */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Case study
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-5">
            We did this for OneHealth Clinics.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">
            OneHealth Clinics was running on a slow WordPress install with no clear ownership model.
            We migrated them to Next.js 15, preserved all their SEO equity with 301 redirects, and
            rebuilt their full site — home, services, pediatrics, about, and contact — resulting in
            13,000+ monthly search impressions.
          </p>
          <Link
            href="/work/onehealth"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
            style={{ color: "var(--terracotta-500)", textDecoration: "none" }}
          >
            Read the full case study <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
            Ready to leave WordPress behind?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Tell us about your current site — we&rsquo;ll scope out the migration and send you a
            clear plan before any work starts.
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
