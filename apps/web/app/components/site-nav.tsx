"use client";

import { Button } from "@site-haus/ui/components/base/button";
import { ModeToggle } from "@site-haus/ui/components/base/mode-toggle";
import { Menu, MoveRight, Rocket, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { text: "Services", href: "/services" },
  { text: "Our Method", href: "/our-method" },
  { text: "Platform", href: "/platform" },
  { text: "About", href: "/about" },
  { text: "Contact", href: "/contact" },
];

export const SiteNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b border-border/50">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <Image
            src="/sitehaus-icon.svg"
            width={20}
            height={20}
            alt=""
            className="filter dark:invert"
          />
          <span className="text-xl tracking-wider font-display">SiteHaus</span>
        </Link>

        {/* Desktop links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/65 hover:text-foreground transition-colors duration-150"
            >
              {link.text}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <ModeToggle />
          <Button size="sm" className="tracking-wide" asChild>
            <Link href="/contact">
              Start a project
              <Rocket aria-hidden="true" className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile: mode toggle + hamburger */}
        <div className="flex items-center gap-1 md:hidden">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="md:hidden bg-background border-t border-border/50"
        >
          <div className="container mx-auto px-6 py-4 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-2 py-2.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
              >
                {link.text}
              </Link>
            ))}

            <div aria-hidden="true" className="h-px bg-border/60 my-3" />

            <Button className="w-full justify-center" asChild>
              <Link href="/contact" onClick={() => setOpen(false)}>
                Start a project <MoveRight aria-hidden="true" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
};
