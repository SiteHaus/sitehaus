import { Button } from "@site-haus/ui/components/base/button";
import type { Metadata } from "next";
import { MapPin, MoveRight } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../components/json-ld";

export const metadata: Metadata = {
  title: "About",
  description:
    "Two senior engineers. No account managers, no handoffs, no middlemen. When you work with SiteHaus, you work directly with the people building your software.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About | SiteHaus",
    description:
      "Two senior engineers. No account managers, no handoffs, no middlemen. When you work with SiteHaus, you work directly with the people building your software.",
    url: "/about",
  },
  twitter: {
    title: "About | SiteHaus",
    description:
      "Two senior engineers. No account managers, no handoffs, no middlemen. When you work with SiteHaus, you work directly with the people building your software.",
  },
};

const founders = [
  {
    initials: "P",
    name: "Parker",
    title: "Co-founder & Engineer",
    location: "Ogden, UT",
    bio: "Seven-plus years building software across the full stack. Parker brings production-hardened experience across web, mobile, and backend systems — and an obsession with getting the details right.",
  },
  {
    initials: "E",
    name: "Ethan",
    title: "Co-founder & Engineer",
    location: "St George, UT",
    bio: "CS degree and years of production experience across software engineering and QA. Ethan makes sure everything we ship is solid — from the architecture down to the last edge case.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-16">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About SiteHaus",
            url: "https://sitehaus.dev/about",
            description:
              "Two senior engineers. No account managers, no handoffs, no middlemen. When you work with SiteHaus, you work directly with the people building your software.",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://sitehaus.dev" },
              { "@type": "ListItem", position: 2, name: "About", item: "https://sitehaus.dev/about" },
            ],
          },
        ]}
      />
      {/* Hero */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-36 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            About us
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Two engineers.{" "}
            <span className="italic font-bold text-foreground/50">
              No middlemen.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            When you work with SiteHaus, you work directly with the people
            writing your code — from the first conversation to the final
            handoff. No account managers, no handoffs to junior devs, no
            one between you and the engineers.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 max-w-5xl">
            <div>
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
                Why we built this
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6">
                We were frustrated clients too.
              </h2>
            </div>
            <div className="flex flex-col gap-5 text-muted-foreground leading-relaxed">
              <p>
                We've seen what happens when software projects go through too
                many layers — scope gets lost in translation, timelines
                slip, and the final product doesn't match what was discussed
                in the first meeting.
              </p>
              <p>
                SiteHaus exists because we believe software clients deserve
                better. A clear document before a line of code is written. A
                real-time view of everything happening on their project. And
                direct access to the engineers who know the system inside and
                out.
              </p>
              <p>
                We work fully remote and have built our entire workflow around
                it — async communication, documented decisions, and a client
                dashboard that keeps everyone on the same page without
                requiring anyone to be in the same room. It works because the
                process is built to work, not because we're physically present.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founders */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-12 md:mb-16">
            The team
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            {founders.map((founder) => (
              <div
                key={founder.name}
                className="flex flex-col gap-6 p-8 rounded-2xl border border-border/60 bg-card/40"
              >
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-xl font-bold text-primary/70">
                      {founder.initials}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-lg leading-tight">{founder.name}</p>
                    <p className="text-sm text-muted-foreground">{founder.title}</p>
                  </div>
                </div>

                <p className="text-muted-foreground leading-relaxed text-sm">
                  {founder.bio}
                </p>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-auto">
                  <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
                  {founder.location}
                </div>
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
            You'll always know who's building your software.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Reach out and you'll hear back from one of us directly — not a
            sales rep, not a bot. Just two engineers who want to understand
            your project.
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
