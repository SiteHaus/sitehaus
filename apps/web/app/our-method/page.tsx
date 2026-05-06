import { Button } from "@site-haus/ui/components/base/button";
import type { Metadata } from "next";
import { MoveRight } from "lucide-react";
import Link from "next/link";
import { JsonLd } from "../components/json-ld";

export const metadata: Metadata = {
  title: "Our Development Process",
  description:
    "Document-driven development. Fully transparent. You will never have to ask what we're working on — every decision, milestone, and update is visible from day one.",
  alternates: { canonical: "/our-method" },
  openGraph: {
    title: "Our Development Process | SiteHaus",
    description:
      "Document-driven development. Fully transparent. You will never have to ask what we're working on — every decision, milestone, and update is visible from day one.",
    url: "/our-method",
  },
  twitter: {
    title: "Our Development Process | SiteHaus",
    description:
      "Document-driven development. Fully transparent. You will never have to ask what we're working on — every decision, milestone, and update is visible from day one.",
  },
};

const steps = [
  {
    number: "01",
    title: "Discovery Call",
    description:
      "We start with a conversation — no forms, no questionnaires. We want to understand your business, your goals, and what you're trying to build. We'll ask the right questions so we can write the right document.",
  },
  {
    number: "02",
    title: "Design Document",
    description:
      "Before any code is written, we produce a comprehensive design document. It covers exactly what we're building, how every feature works, what it costs, and when you'll have it. You approve it — or we revise it — before work begins.",
    highlight: true,
  },
  {
    number: "03",
    title: "Feedback & Revisions",
    description:
      "You review the document on your own time. We go back and forth until every detail is right. This is where misunderstandings get caught — not six weeks into a build.",
  },
  {
    number: "04",
    title: "Milestones",
    description:
      "The project gets broken into clear, deliverable milestones. Each one has a defined scope and a date. You always know what's being built right now, what's coming next, and what done looks like.",
  },
  {
    number: "05",
    title: "Build",
    description:
      "Work begins. Every update, every completed task, every milestone is visible to you on the dashboard in real time. You never need to send a \"what's the status?\" message — it's all there.",
    highlight: true,
  },
  {
    number: "06",
    title: "Delivery & Handoff",
    description:
      "You receive full source code, documentation, and deployment knowledge. We do a complete handoff so you own everything we built — whether you maintain it in-house or keep working with us.",
  },
];

export default function OurMethodPage() {
  return (
    <main className="min-h-screen pt-24">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "How SiteHaus Works",
            description:
              "Document-driven software development process — from discovery to delivery.",
            step: steps.map((s) => ({
              "@type": "HowToStep",
              name: s.title,
              text: s.description,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://sitehaus.dev" },
              {
                "@type": "ListItem",
                position: 2,
                name: "Our Method",
                item: "https://sitehaus.dev/our-method",
              },
            ],
          },
        ]}
      />
      {/* Hero */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-36 border-b border-border/50">
        <div className="container mx-auto px-6 max-w-4xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            How we work
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
            Document-driven.{" "}
            <span className="italic font-bold text-foreground/50">Fully transparent.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            You will never have to ask what we're working on. Every decision, every milestone, every
            line of progress is visible to you before we start and throughout the entire build.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="relative flex flex-col gap-0">
              {/* Vertical line */}
              <div className="absolute left-[27px] top-8 bottom-8 w-px bg-border/60 hidden md:block" />

              {steps.map((step) => (
                <div key={step.number} className="flex gap-6 md:gap-10 pb-14">
                  {/* Number bubble */}
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div
                      className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-full border-2 text-sm font-bold font-display ${
                        step.highlight
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground/60"
                      }`}
                    >
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-3 pb-2">
                    <h2 className="text-xl md:text-2xl font-bold mb-3">{step.title}</h2>
                    <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard callout */}
      <section className="py-14 sm:py-20 md:py-28 border-t border-border/50 bg-muted/30">
        <div className="container mx-auto px-6 max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            The dashboard
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-5">
            Your project lives in one place.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Our client dashboard gives you a real-time view of everything — your design document,
            active milestones, completed work, uploaded assets, and open tickets. No email threads,
            no status meetings, no guessing.
          </p>
          <Button size="lg" variant="outline" className="h-12 text-base" asChild>
            <Link href="/contact">
              Start with a conversation <MoveRight className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
