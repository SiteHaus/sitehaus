import type { Metadata } from "next";
import { Monitor, MoveRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../../components/json-ld";

export const metadata: Metadata = {
  title: "Desktop Software Development in Utah",
  description:
    "Custom desktop software for Windows, Mac, and Linux. Internal tools, hardware-integrated apps, and offline-first software built with Tauri for Utah businesses.",
  alternates: { canonical: "/services/desktop-software" },
  openGraph: {
    title: "Desktop Software Development in Utah | SiteHaus",
    description:
      "Custom desktop software for Windows, Mac, and Linux. Internal tools, hardware-integrated apps, and offline-first software built with Tauri.",
    url: "/services/desktop-software",
  },
  twitter: {
    title: "Desktop Software Development in Utah | SiteHaus",
    description:
      "Custom desktop software for Windows, Mac, and Linux. Internal tools, hardware-integrated apps, and offline-first software built with Tauri.",
  },
  keywords: [
    "desktop software development Utah",
    "Tauri development",
    "desktop app developer Utah",
    "Windows app development",
  ],
};

export default function DesktopSoftwarePage() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Desktop Software Development",
            provider: { "@type": "Organization", name: "SiteHaus", url: "https://sitehaus.dev" },
            description:
              "Custom desktop software for Windows, Mac, and Linux — internal tools, hardware-integrated apps, and offline-first software.",
            areaServed: ["Ogden, Utah", "Salt Lake City, Utah", "St. George, Utah"],
            serviceType: "Desktop Software Development",
            url: "https://sitehaus.dev/services/desktop-software",
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
                name: "Desktop Software",
                item: "https://sitehaus.dev/services/desktop-software",
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
            <Monitor className="h-6 w-6 text-primary/70" aria-hidden="true" />
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
              Desktop Software
            </p>
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Desktop Software Development{" "}
            <span className="italic font-bold text-foreground/50">in Utah.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed mb-8">
            Some software needs to live on the machine. We build desktop apps for Windows, Mac, and
            Linux — internal business tools, hardware-integrated software, and offline-first
            applications that the browser can&rsquo;t handle.
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
              "Windows, Mac & Linux apps",
              "Internal business tools",
              "Hardware-integrated software",
              "Offline-first applications",
              "Cross-platform desktop (Tauri)",
              "Installer-based software",
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
            Web technologies. Native performance.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
            We build desktop apps with Tauri — a Rust-based framework that wraps a web frontend in a
            native shell. You get the development speed of TypeScript and React with the performance
            and system access of a native application. Smaller binaries than Electron, better
            security model, and full cross-platform support.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Tauri", "Rust", "TypeScript", "React", "Windows", "macOS", "Linux"].map((tech) => (
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
            Need software that runs on the machine?
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Tell us what the browser can&rsquo;t handle — we&rsquo;ll figure out the right
            architecture together.
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
