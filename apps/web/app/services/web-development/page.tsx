import type { Metadata } from "next";
import { Globe, MoveRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../../components/json-ld";

export const metadata: Metadata = {
  title: "Web Development Agency in Utah",
  description:
    "Custom web development for Utah businesses — from marketing sites to full SaaS platforms. Serving Ogden, Salt Lake City, and St. George with Next.js, TypeScript, and modern tooling.",
  alternates: { canonical: "/services/web-development" },
  openGraph: {
    title: "Web Development Agency in Utah | SiteHaus",
    description:
      "Custom web development for Utah businesses — from marketing sites to full SaaS platforms. Serving Ogden, Salt Lake City, and St. George.",
    url: "/services/web-development",
  },
  twitter: {
    title: "Web Development Agency in Utah | SiteHaus",
    description:
      "Custom web development for Utah businesses — from marketing sites to full SaaS platforms. Serving Ogden, Salt Lake City, and St. George.",
  },
};

export default function WebDevelopmentPage() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Web Development",
            provider: { "@type": "Organization", name: "SiteHaus", url: "https://sitehaus.dev" },
            description:
              "Custom web development for Utah businesses — from marketing sites to full SaaS platforms.",
            areaServed: ["Ogden, Utah", "Salt Lake City, Utah", "St. George, Utah"],
            serviceType: "Web Development",
            url: "https://sitehaus.dev/services/web-development",
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
                name: "Web Development",
                item: "https://sitehaus.dev/services/web-development",
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
              Web Development
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Web Development Agency{" "}
            <span className="italic font-bold text-foreground/50">in Utah.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-8">
            From marketing sites to full SaaS platforms — we build for the web at any scale. Serving
            businesses in Ogden, Salt Lake City, and St. George with modern tooling and clear
            delivery.
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
            Start a project <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* What we build */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-8">
            What we build
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Marketing & landing pages",
              "Web applications & SaaS",
              "Customer portals & dashboards",
              "E-commerce storefronts",
              "REST & GraphQL APIs",
              "WordPress to Next.js migrations",
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

      {/* Tech stack */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Our stack
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-5">
            Built to last, not just to ship.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
            We build with Next.js, TypeScript, Tailwind CSS, and PostgreSQL — a modern stack chosen
            for performance, maintainability, and long-term ownership. No WordPress themes, no page
            builders, no technical debt handed off to you on day one.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "Drizzle ORM", "Vercel"].map(
              (tech) => (
                <span
                  key={tech}
                  className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full"
                  style={{ background: "var(--parchment-200)", color: "var(--clay-700)" }}
                >
                  {tech}
                </span>
              ),
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
            Ready to build something on the web?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Every project starts with a conversation. Tell us what you&rsquo;re building and
            we&rsquo;ll write back directly.
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
