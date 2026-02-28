"use client";

import { Button } from "@site-haus/ui/components/base/button";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import { CheckCircle, Loader2, MoveRight } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";
import { submitContact } from "./actions";

const bubbles = [
  {
    src: "/Responsible_Delivery_500p_Textured_V1.png",
    alt: "Sailor giving a thumbs up from a sailboat",
    rotate: "-5deg",
    top: "4%",
    left: "8%",
    delay: "0s",
  },
  {
    src: "/Clear_Scope_500p_Textured_V1.png",
    alt: "Sailor tying a letter to a seagull's foot",
    rotate: "4deg",
    top: "6%",
    right: "6%",
    delay: "1.2s",
  },
  {
    src: "/Modern_Stack_500p_Textured_V1.png",
    alt: "Sailor at the helm of a modern yacht",
    rotate: "-3deg",
    bottom: "22%",
    left: "4%",
    delay: "0.6s",
  },
  {
    src: "/Long-Term_Partners_Textured_500p_V1.png",
    alt: "Sailor embracing a lighthouse",
    rotate: "6deg",
    bottom: "8%",
    right: "4%",
    delay: "1.8s",
  },
];

export default function ContactPage() {
  const [state, formAction, isPending] = useActionState(submitContact, null);

  if (state && "success" in state) {
    return (
      <main className="min-h-screen pt-16 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <CheckCircle className="h-12 w-12 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3">We'll be in touch.</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Thanks for reaching out. We'll review your message and get back to
            you shortly.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-16">
      <div className="container mx-auto px-6 py-14 sm:py-20 md:py-28 lg:py-36">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Form */}
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
              Get in touch
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-5">
              Let's talk about{" "}
              <span className="italic font-bold text-foreground/50">
                your project.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10 sm:mb-12">
              Tell us what you're building and we'll get back to you. No
              commitment, no sales pitch — just a conversation.
            </p>

            <form action={formAction} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">
                    Name <span className="text-muted-foreground">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Your name"
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">
                    Email <span className="text-muted-foreground">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    required
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="company">
                  Company{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="company"
                  name="company"
                  placeholder="Your company or organization"
                  disabled={isPending}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="message">
                  Message <span className="text-muted-foreground">*</span>
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Tell us what you're trying to build..."
                  rows={6}
                  required
                  disabled={isPending}
                  className="resize-none"
                />
              </div>

              {state && "error" in state && (
                <p role="alert" aria-live="assertive" className="text-sm text-destructive">
                  {state.error}
                </p>
              )}

              <div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 text-base"
                  disabled={isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send message <MoveRight className="ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Floating bubbles — decorative */}
          <div aria-hidden="true" className="relative hidden lg:block">
            {bubbles.map((b) => (
              <div
                key={b.src}
                className="absolute w-[200px] h-[200px] rounded-full overflow-hidden cursor-default transition-[z-index,transform] duration-300 hover:scale-105 hover:z-50"
                style={{
                  top: b.top,
                  left: b.left,
                  right: b.right,
                  bottom: b.bottom,
                  rotate: b.rotate,
                  zIndex: 10,
                  animation: `float 5s ease-in-out ${b.delay} infinite`,
                  boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
                }}
              >
                <Image
                  src={b.src}
                  alt={b.alt}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
