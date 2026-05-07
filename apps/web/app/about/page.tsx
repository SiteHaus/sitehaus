import { Button } from "@site-haus/ui/components/base/button";
import type { Metadata } from "next";
import { MapPin, MoveRight } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../components/json-ld";

export const metadata: Metadata = {
  title: "About Us — Utah Software Development Studio",
  description:
    "Two senior engineers based in Utah building software for businesses. Direct communication, no middlemen, no handoffs — you work with the people writing your code.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us — Utah Software Development Studio | SiteHaus",
    description:
      "Two senior engineers based in Utah building software for businesses. Direct communication, no middlemen, no handoffs.",
    url: "/about",
  },
  twitter: {
    title: "About Us — Utah Software Development Studio | SiteHaus",
    description:
      "Two senior engineers based in Utah building software for businesses. Direct communication, no middlemen, no handoffs.",
  },
  keywords: [
    "Utah software agency",
    "indie software studio",
    "SiteHaus team",
    "software engineers Utah",
    "custom software founders",
  ],
};

const founders = [
  {
    initials: "E",
    name: "Ethan",
    title: "Co-founder & Engineer",
    location: "St George, UT",
    bio: "CS degree and years of production experience across software engineering and QA. Ethan makes sure everything we ship is solid — from the architecture down to the last edge case.",
  },
  {
    initials: "P",
    name: "Parker",
    title: "Co-founder & Engineer",
    location: "Ogden, UT",
    bio: "Full-stack experience across web, mobile, and backend — from infrastructure to UI. Parker has shipped production software at every layer of the stack and cares about getting the details right.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-24">
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
              {
                "@type": "ListItem",
                position: 2,
                name: "About",
                item: "https://sitehaus.dev/about",
              },
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
            <span className="italic font-bold text-foreground/50">No middlemen.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            When you email us, one of us writes back. When we're on a call, you're talking to the
            person writing the code. No account managers, no handoffs.
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
                We've both seen what happens when software projects go through too many layers.
                Scope drifts. Timelines slip. By the time it ships, nobody's quite sure it matches
                what was agreed on.
              </p>
              <p>
                SiteHaus exists because we think clients deserve to know exactly what they're paying
                for before work starts — and to talk directly to the people doing it.
              </p>
              <p>
                We work fully remote and built our entire process around it. Async by default,
                everything documented, progress always visible. You don't need us in the room to
                know what's happening.
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

                <p className="text-muted-foreground leading-relaxed text-sm">{founder.bio}</p>

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
            Reach out and you'll hear back from one of us directly — not a sales rep, not a bot.
            Just two engineers who want to understand your project.
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
