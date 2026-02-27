"use client";

import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { ArrowDown, MoveRight, ShipWheel } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const values = [
  {
    title: "Responsible Delivery",
    description:
      "We will always treat Performance, Security, Reliability, and Maintainability as first-class concerns.",
    image: "/Responsible_Delivery_500p_Textured_V1.png",
    alt: "Sailor giving a thumbs up from a sailboat",
    rotate: "-rotate-[3deg]",
  },
  {
    title: "Modern Stack",
    description:
      "We don't just ship features, we build maintainable systems. Modern tech stacks, security best practices, and infrastructure that scales with your needs.",
    image: "/Modern_Stack_500p_Textured_V1.png",
    alt: "Sailor at the helm of a modern yacht",
    rotate: "rotate-[2deg]",
  },
  {
    title: "Clear Scope & Communication",
    description:
      "We start every project with a comprehensive design document and milestone plan. You'll know exactly what you're getting, what it costs, and when to expect it before any code is written.",
    image: "/Clear_Scope_500p_Textured_V1.png",
    alt: "Sailor tying a letter to a seagull's foot",
    rotate: "-rotate-[2deg]",
  },
  {
    title: "Long-Term Partners",
    description:
      "You own everything we build. Full source code, documentation, and deployment knowledge transfer. Whether you want to maintain it in-house or partner with us long-term, the choice is always yours.",
    image: "/Long-Term_Partners_Textured_500p_V1.png",
    alt: "Sailor embracing a lighthouse",
    rotate: "rotate-[3deg]",
  },
];

const ROMAN = ["I", "II", "III", "IV"];

export default function App() {
  return (
    <main className="min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative h-screen w-full overflow-hidden">
        <Image
          src="/sitehaus-hero.png"
          alt="SiteHaus — coastal lighthouse illustration"
          fill
          priority
          className="object-cover -z-10 hidden sm:block brightness-[0.88] saturate-[0.85]"
        />
        <Image
          src="/sitehaus-hero-sm.png"
          alt="SiteHaus — coastal lighthouse illustration"
          fill
          priority
          className="object-cover -z-10 sm:hidden brightness-[0.88] saturate-[0.85]"
        />

        {/* Left-side vignette to anchor the text */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/55 via-background/15 to-transparent dark:from-background/80 dark:via-background/30 dark:to-transparent" />

        <div className="container mx-auto h-full flex items-center px-4 sm:px-6">
          <div className="flex flex-col z-10 max-w-4xl">
            <Link href="/contact">
              <Badge
                variant="default"
                className="font-display group inline-flex items-center gap-2 text-sm md:text-base mb-5 border shadow-md px-3 py-2 md:px-4 md:py-2.5 w-fit"
              >
                We&apos;re available for new projects
                <MoveRight className="transition-all duration-200 ease-out group-hover:translate-x-1" />
              </Badge>
            </Link>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-wide pb-4 md:pb-5 font-semibold leading-[1.05]">
              Your <span className="italic font-bold">long-term</span>
              <br />
              <span className="italic font-bold">partner</span> in software
            </h1>

            <p className="text-base sm:text-lg md:text-xl pt-2 text-foreground/75 leading-relaxed max-w-md">
              We design and build web, mobile, and desktop software — with clear
              plans, shared milestones, and software built to be owned.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-8 md:mt-10">
              <Button
                size="lg"
                className="h-11 md:h-12 text-sm md:text-base shadow-sm"
                asChild
              >
                <Link href="/contact">
                  Start a project <MoveRight className="ml-1" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="h-11 md:h-12 text-sm md:text-base"
                asChild
              >
                <Link href="/work">See our work</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
          <div className="animate-bounce rounded-full border border-foreground/20 bg-background/30 backdrop-blur-sm px-3 py-2">
            <ArrowDown className="h-4 w-4 text-foreground/50" />
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────── */}
      <section className="py-24 md:py-36 overflow-hidden">
        <div className="container mx-auto px-6">
          {/* Section header */}
          <div className="mb-20 md:mb-28">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-3">
              Our commitments
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight max-w-lg leading-tight">
              What we stand for
            </h2>
          </div>

          {/* Entries */}
          <div className="flex flex-col">
            {values.map((value, i) => {
              const isEven = i % 2 === 0;
              return (
                <div key={value.title}>
                  <div
                    className={`flex flex-col-reverse gap-10 py-16 md:py-20 ${
                      isEven ? "md:flex-row" : "md:flex-row-reverse"
                    } items-center md:gap-16 lg:gap-24`}
                  >
                    {/* Text side */}
                    <div className="flex-1 min-w-0">
                      {/* Ghost numeral */}
                      <span
                        className="font-display block leading-none text-[clamp(5rem,12vw,9rem)] font-bold text-foreground/[0.05] select-none -mb-4 md:-mb-6"
                        aria-hidden
                      >
                        {ROMAN[i]}
                      </span>

                      <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 md:mb-5 leading-tight">
                        {value.title}
                      </h3>
                      <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md">
                        {value.description}
                      </p>
                    </div>

                    {/* Image side — floats freely, no card */}
                    <div className="flex-shrink-0 flex items-center justify-center w-full md:w-auto">
                      <Image
                        src={value.image}
                        alt={value.alt}
                        width={280}
                        height={280}
                        className={`
                          w-[220px] md:w-[260px] lg:w-[300px] h-auto
                          ${value.rotate}
                          hover:rotate-0
                          transition-transform duration-500 ease-out
                          drop-shadow-[0_20px_40px_rgba(0,0,0,0.12)]
                        `}
                      />
                    </div>
                  </div>

                  {/* Separator */}
                  {i < values.length - 1 && (
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-border/60" />
                      <ShipWheel className="text-primary/30" />
                      <div className="flex-1 h-px bg-border/60" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
