"use client";

import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import { ArrowDown, MoveRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function App() {
  return (
    <main className="min-h-screen">
      <section className="relative h-screen w-full overflow-hidden">
        <Image
          src="/sitehaus-hero.png"
          alt="Site Haus Illustration with Lighthouse and Cliffside"
          fill
          priority
          className="object-cover -z-5"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[rgba(255,255,255,0.25)] via-[rgba(255,255,255,0.10)] to-transparent dark:from-[rgba(0,0,0,0.6)] dark:via-[rgba(0,0,0,0.3)]" />

        <div className="container mx-auto h-full flex items-center">
          <div className="flex flex-col z-10">
            <Link href="/contact">
              <Badge
                variant="secondary"
                className="font-display group inline-flex items-center gap-2 text-md mb-12 bg-secondary/80 border shadow-md"
              >
                <Sparkles className="text-yellow-500" /> We're available for new
                projects
                <MoveRight className="ml-2 group transition-all duration-200 ease-out group-hover:ml-6" />
              </Badge>
            </Link>
            <h1 className="text-6xl tracking-wide pb-6 font-semibold">
              We design
              <br /> and build modern software
            </h1>
            <p className="text-xl">
              We design and build web, mobile, and desktop <br /> applications
              -- from early concepts to production-ready systems.
            </p>

            <div className="space-x-4 mt-6">
              <Button
                variant="secondary"
                size="lg"
                className="bg-secondary/80 border shadow-md"
              >
                Start a project <MoveRight />
              </Button>
              <Button size="lg">See our work</Button>
            </div>
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <div className="animate-pulse rounded-full border border-white/25 bg-black/20 px-3 py-2 text-white/80">
          <ArrowDown />
        </div>
      </div>
    </main>
  );
}
