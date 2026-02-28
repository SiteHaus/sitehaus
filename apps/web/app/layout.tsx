import { ThemeProvider } from "@site-haus/ui/components/base/theme-provider";
import type { Metadata } from "next";
import { Baskervville, Figtree } from "next/font/google";

import { SiteNav } from "./components/site-nav";
import "./globals.css";

const displayFont = Baskervville({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "700"],
});

const bodyFont = Figtree({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SiteHaus",
    template: "%s | SiteHaus",
  },
  description:
    "Your long-term partner in software. We design and build web, mobile, and desktop software with clear plans, shared milestones, and no surprises.",
  openGraph: {
    siteName: "SiteHaus",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} bg-hazy-dots`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-background focus:border focus:border-border focus:rounded-md focus:text-sm focus:font-semibold focus:shadow-md"
          >
            Skip to main content
          </a>
          <SiteNav />
          <div id="main-content">{children}</div>
          <footer className="border-t border-border/50 pt-14 pb-10">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-16 mb-12">
                {/* Brand */}
                <div className="max-w-xs">
                  <span className="font-display text-lg tracking-wider">SiteHaus</span>
                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                    Your long-term partner in software. We build web, mobile, and desktop software with clear plans and no surprises.
                  </p>
                </div>

                {/* Links */}
                <div className="flex gap-16 sm:gap-24 text-sm">
                  <nav aria-label="Company pages" className="flex flex-col gap-3">
                    <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                      Company
                    </span>
                    <a href="/services" className="text-muted-foreground hover:text-foreground transition-colors">Services</a>
                    <a href="/our-method" className="text-muted-foreground hover:text-foreground transition-colors">Our Method</a>
                    <a href="/platform" className="text-muted-foreground hover:text-foreground transition-colors">Platform</a>
                    <a href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
                    <a href="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
                  </nav>
                  <nav aria-label="Legal pages" className="flex flex-col gap-3">
                    <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
                      Legal
                    </span>
                    <a href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a>
                  </nav>
                </div>
              </div>

              <div className="pt-6 border-t border-border/40 text-xs text-muted-foreground">
                {new Date().getFullYear()} © SiteHaus LLC. All rights reserved.
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
