"use client";

import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@site-haus/ui/components/base/input-group";
import { ArrowDown, Mail, MoveRight, Sparkles } from "lucide-react";
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
                className="font-display group inline-flex items-center gap-2 text-md mb-6 bg-secondary/70 border shadow-md"
              >
                <Sparkles className="text-yellow-500" /> We're available for new
                projects
                <MoveRight className="ml-2 group transition-all duration-200 ease-out group-hover:ml-6" />
              </Badge>
            </Link>
            <h1 className="text-8xl tracking-wide pb-6 font-semibold">
              Your{" "}
              <span className="italic font-bold tracking-wide">long-term </span>{" "}
              <br />{" "}
              <span className="italic font-bold tracking-wide">partner</span> in
              software
            </h1>
            <p className="text-2xl tracking-wider pt-6">
              We design and build web, mobile, and desktop software — with clear{" "}
              <br />
              plans, shared milestones, and software built to be owned.
            </p>

            <div className="flex items-center justify-center gap-2 mt-12">
              <InputGroup className="h-12 bg-secondary/70 border shadow-lg">
                <InputGroupAddon align="inline-start">
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput placeholder="Email" className="!text-lg" />
              </InputGroup>
              <Button size="lg" className="h-12">
                Start a conversation <MoveRight />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
        <div className="animate-bounce rounded-full border border-white/25 bg-black/20 px-3 py-2 text-white/80">
          <ArrowDown />
        </div>
      </div>

      <div className="h-[50vh] container mx-auto py-12">
        <h2 className="text-4xl font-bold tracking-wide">Section Heading</h2>
        <p className="text-lg">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat odit
          iste molestiae sequi natus, incidunt consequuntur eveniet quia velit
          laborum vel commodi rerum consectetur rem! Dolor non odit eos culpa?
        </p>
      </div>

      <div className="h-[50vh] container mx-auto py-12">
        <h2 className="text-4xl font-bold tracking-wide">Section Heading</h2>
        <p className="text-lg">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat odit
          iste molestiae sequi natus, incidunt consequuntur eveniet quia velit
          laborum vel commodi rerum consectetur rem! Dolor non odit eos culpa?
        </p>
      </div>

      <div className="h-[50vh] container mx-auto py-12">
        <h2 className="text-4xl font-bold tracking-wide">Section Heading</h2>
        <p className="text-lg">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat odit
          iste molestiae sequi natus, incidunt consequuntur eveniet quia velit
          laborum vel commodi rerum consectetur rem! Dolor non odit eos culpa?
        </p>
      </div>

      <div className="h-[50vh] container mx-auto py-12">
        <h2 className="text-4xl font-bold tracking-wide">Section Heading</h2>
        <p className="text-lg">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat odit
          iste molestiae sequi natus, incidunt consequuntur eveniet quia velit
          laborum vel commodi rerum consectetur rem! Dolor non odit eos culpa?
        </p>
      </div>

      <div className="h-[50vh] container mx-auto py-12">
        <h2 className="text-4xl font-bold tracking-wide">Section Heading</h2>
        <p className="text-lg">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat odit
          iste molestiae sequi natus, incidunt consequuntur eveniet quia velit
          laborum vel commodi rerum consectetur rem! Dolor non odit eos culpa?
        </p>
      </div>

      <div className="h-[50vh] container mx-auto py-12">
        <h2 className="text-4xl font-bold tracking-wide">Section Heading</h2>
        <p className="text-lg">
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Repellat odit
          iste molestiae sequi natus, incidunt consequuntur eveniet quia velit
          laborum vel commodi rerum consectetur rem! Dolor non odit eos culpa?
        </p>
      </div>
    </main>
  );
}
