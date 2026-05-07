import type { Metadata } from "next";
import { ShoppingBag, MoveRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../../components/json-ld";

export const metadata: Metadata = {
  title: "Custom Ecommerce Development in Utah",
  description:
    "Custom ecommerce development for Utah businesses. No Shopify fees, no platform lock-in — fully owned storefronts with Stripe payments, inventory management, and a real admin interface.",
  alternates: { canonical: "/services/custom-ecommerce" },
  openGraph: {
    title: "Custom Ecommerce Development in Utah | SiteHaus",
    description:
      "Custom ecommerce development for Utah businesses. No Shopify fees, no platform lock-in — fully owned storefronts with Stripe payments.",
    url: "/services/custom-ecommerce",
  },
  twitter: {
    title: "Custom Ecommerce Development in Utah | SiteHaus",
    description:
      "Custom ecommerce development for Utah businesses. No Shopify fees, no platform lock-in — fully owned storefronts with Stripe payments.",
  },
  keywords: [
    "custom ecommerce development Utah",
    "ecommerce website Utah",
    "online store development",
    "no platform fees ecommerce",
  ],
};

export default function CustomEcommercePage() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Custom Ecommerce Development",
            provider: { "@type": "Organization", name: "SiteHaus", url: "https://sitehaus.dev" },
            description:
              "Custom ecommerce development — fully owned storefronts with Stripe payments, inventory management, and no platform fees.",
            areaServed: ["Ogden, Utah", "Salt Lake City, Utah", "St. George, Utah"],
            serviceType: "Ecommerce Development",
            url: "https://sitehaus.dev/services/custom-ecommerce",
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
                name: "Custom Ecommerce",
                item: "https://sitehaus.dev/services/custom-ecommerce",
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
            <ShoppingBag className="h-6 w-6 text-primary/70" aria-hidden="true" />
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
              Custom Ecommerce
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Custom Ecommerce Development{" "}
            <span className="italic font-bold text-foreground/50">in Utah.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-8">
            Sell products without paying platform fees forever. We build fully custom storefronts —
            Stripe Connect payments, inventory management, order lifecycle, and a real admin
            interface. You own every line of it.
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

      {/* What's included */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-8">
            What&rsquo;s included
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              "Product catalog & inventory management",
              "Stripe Connect payments (zero platform fees)",
              "Full order lifecycle & returns",
              "Customer accounts & order history",
              "Admin dashboard & reporting",
              "Cloudflare R2 image storage",
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

      {/* Platform callout */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50 bg-muted/30">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Already built
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-5">
            SiteHaus Commerce — our white-label platform.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-6">
            We&rsquo;ve already built and battle-tested a full ecommerce infrastructure — NestJS
            microservices, 32-table PostgreSQL schema, BullMQ async workers, and Stripe Connect.
            Clients get a fully custom storefront on top of proven infrastructure. No Shopify. No
            WooCommerce. No monthly platform fees.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "NestJS microservices",
              "PostgreSQL",
              "BullMQ + Redis",
              "Stripe Connect",
              "Cloudflare R2",
            ].map((tech) => (
              <span
                key={tech}
                className="text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{ background: "var(--parchment-200)", color: "var(--clay-700)" }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-2xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
            Ready to own your storefront?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Tell us what you&rsquo;re selling and we&rsquo;ll scope out the right solution — whether
            that&rsquo;s our existing platform or something built entirely for you.
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
