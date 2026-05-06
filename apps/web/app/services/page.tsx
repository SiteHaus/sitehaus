import { Button } from "@site-haus/ui/components/base/button";
import type { Metadata } from "next";
import { ArrowRight, Globe, Monitor, MoveRight, Smartphone } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../components/json-ld";

export const metadata: Metadata = {
  title: "Custom Software Development Services in Utah",
  description:
    "Web, mobile, and desktop software development for Utah businesses. Serving Ogden, Salt Lake City, and St. George — custom-built with clear plans, no surprises.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Custom Software Development Services in Utah | SiteHaus",
    description:
      "Web, mobile, and desktop software development for Utah businesses. Serving Ogden, Salt Lake City, and St. George — custom-built with clear plans, no surprises.",
    url: "/services",
  },
  twitter: {
    title: "Custom Software Development Services in Utah | SiteHaus",
    description:
      "Web, mobile, and desktop software development for Utah businesses. Serving Ogden, Salt Lake City, and St. George — custom-built with clear plans, no surprises.",
  },
};

const services = [
  {
    icon: Globe,
    title: "Web",
    tagline: "Websites, web apps, and everything in between.",
    description:
      "From marketing sites to full SaaS platforms — we build for the web at any scale. Custom dashboards, customer portals, e-commerce, APIs, internal tools. If your business runs on a browser, we can build it.",
    examples: [
      "Marketing & landing pages",
      "Web applications & SaaS",
      "Customer portals & dashboards",
      "E-commerce storefronts",
      "REST & GraphQL APIs",
    ],
    learnMore: "/services/web-development",
  },
  {
    icon: Smartphone,
    title: "Mobile",
    tagline: "iOS and Android apps your customers will actually use.",
    description:
      "We build native-quality mobile apps for both platforms. Whether you need a companion app for your existing product or a standalone mobile experience, we design for the device first.",
    examples: [
      "iOS & Android apps",
      "Cross-platform (React Native)",
      "Offline-capable apps",
      "Push notifications & real-time data",
      "App Store & Play Store submission",
    ],
    learnMore: "/services/mobile-apps",
  },
  {
    icon: Monitor,
    title: "Desktop",
    tagline: "Windows, Mac, and Linux — when the browser isn't enough.",
    description:
      "Some software needs to live on the machine. We build desktop apps for all major platforms — internal tools, installer-based software, apps that need hardware access or offline-first capabilities.",
    examples: [
      "Windows, Mac & Linux apps",
      "Internal business tools",
      "Hardware-integrated software",
      "Offline-first applications",
      "Cross-platform desktop (Tauri / Electron)",
    ],
    learnMore: "/services/desktop-software",
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Custom Software Development",
            provider: { "@type": "Organization", name: "SiteHaus", url: "https://sitehaus.dev" },
            description:
              "We build web, mobile, and desktop software for any business. Custom software with clear plans, shared milestones, and no surprises.",
            serviceType: ["Web Development", "Mobile App Development", "Desktop Software"],
            url: "https://sitehaus.dev/services",
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
            ],
          },
        ]}
      />
      {/* Hero */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-36 border-b border-border/50">
        <div className="container mx-auto px-6">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            What we build
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 max-w-3xl">
            Any software. <span className="italic font-bold text-foreground/50">Any platform.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
            We don't specialize in one slice of the stack. If it runs on a screen, we can design and
            build it — with clear plans and no surprises.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="flex flex-col divide-y divide-border/50">
            {services.map((service, i) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="flex flex-col md:flex-row gap-8 md:gap-20 py-10 md:py-16 lg:py-20"
                >
                  {/* Left */}
                  <div className="md:w-72 flex-shrink-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                        0{i + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <Icon className="h-6 w-6 text-primary/70" />
                      <h2 className="text-3xl md:text-4xl font-bold">{service.title}</h2>
                    </div>
                    <p className="text-base text-muted-foreground font-medium leading-snug">
                      {service.tagline}
                    </p>
                  </div>

                  {/* Right */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8">
                      {service.description}
                    </p>
                    <ul className="flex flex-col gap-2 mb-6">
                      {service.examples.map((ex) => (
                        <li key={ex} className="flex items-center gap-3 text-sm text-foreground/70">
                          <span className="h-1 w-1 rounded-full bg-primary/60 flex-shrink-0" />
                          {ex}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={service.learnMore}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                    >
                      Learn more <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-32 border-t border-border/50 bg-muted/30">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Ready to build?
          </p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight mb-6">
            Every project starts with a conversation.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            No pricing tables. No packages. Every engagement is scoped to what you actually need.
            Reach out and we'll talk through it.
          </p>
          <Button size="lg" className="h-12 text-base" asChild>
            <Link href="/contact">
              Start a conversation <MoveRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
