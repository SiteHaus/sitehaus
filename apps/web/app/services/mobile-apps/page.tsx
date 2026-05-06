import type { Metadata } from "next";
import { Smartphone, MoveRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../../components/json-ld";

export const metadata: Metadata = {
  title: "Mobile App Development in Utah",
  description:
    "iOS and Android app development for Utah businesses. Native-quality mobile apps built with React Native, serving Ogden, Salt Lake City, and St. George.",
  alternates: { canonical: "/services/mobile-apps" },
  openGraph: {
    title: "Mobile App Development in Utah | SiteHaus",
    description:
      "iOS and Android app development for Utah businesses. Native-quality mobile apps built with React Native.",
    url: "/services/mobile-apps",
  },
  twitter: {
    title: "Mobile App Development in Utah | SiteHaus",
    description:
      "iOS and Android app development for Utah businesses. Native-quality mobile apps built with React Native.",
  },
};

export default function MobileAppsPage() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Mobile App Development",
            provider: { "@type": "Organization", name: "SiteHaus", url: "https://sitehaus.dev" },
            description:
              "iOS and Android app development for Utah businesses. Native-quality mobile apps built with React Native.",
            areaServed: ["Ogden, Utah", "Salt Lake City, Utah", "St. George, Utah"],
            serviceType: "Mobile App Development",
            url: "https://sitehaus.dev/services/mobile-apps",
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
                name: "Mobile Apps",
                item: "https://sitehaus.dev/services/mobile-apps",
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
            <Smartphone className="h-6 w-6 text-primary/70" aria-hidden="true" />
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
              Mobile Apps
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Mobile App Development{" "}
            <span className="italic font-bold text-foreground/50">in Utah.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-8">
            iOS and Android apps your customers will actually use. We build native-quality mobile
            experiences for both platforms — designed for the device first, delivered with full
            source code.
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
              "iOS & Android apps",
              "Cross-platform (React Native)",
              "Offline-capable apps",
              "Push notifications & real-time data",
              "App Store & Play Store submission",
              "Companion apps for existing products",
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
            One codebase. Both platforms.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
            We build with React Native and Expo — giving you a single TypeScript codebase that ships
            to both iOS and Android with native performance. Where platform-specific behavior
            matters, we write native code.
          </p>
          <div className="flex flex-wrap gap-2">
            {["React Native", "Expo", "TypeScript", "iOS", "Android", "App Store Connect"].map(
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
            Have a mobile app idea?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Tell us what you&rsquo;re building — we&rsquo;ll write back directly and we can go from
            there.
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
