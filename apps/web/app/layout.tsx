import type { Metadata } from "next";
import { Fraunces, Inter_Tight, JetBrains_Mono } from "next/font/google";

import { JsonLd } from "./components/json-ld";
import { SiteNav } from "./components/site-nav";
import "./globals.css";

const displayFont = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const bodyFont = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "SiteHaus",
    template: "%s | SiteHaus",
  },
  description:
    "Your long-term partner in software. We design and build web, mobile, and desktop software with clear plans, shared milestones, and no surprises.",
  metadataBase: new URL("https://sitehaus.dev"),
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "SiteHaus",
    type: "website",
    url: "https://sitehaus.dev",
    title: "SiteHaus",
    description:
      "Your long-term partner in software. We design and build web, mobile, and desktop software with clear plans, shared milestones, and no surprises.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SiteHaus" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SiteHaus",
    description:
      "Your long-term partner in software. We design and build web, mobile, and desktop software with clear plans, shared milestones, and no surprises.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable}`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-semibold focus:shadow-md"
          style={{
            background: "var(--parchment-50)",
            color: "var(--ink-900)",
            border: "1px solid var(--line)",
          }}
        >
          Skip to main content
        </a>
        <JsonLd
          data={[
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "SiteHaus",
              url: "https://sitehaus.dev",
              logo: "https://sitehaus.dev/sitehaus-icon.svg",
              description:
                "Your long-term partner in software. We design and build web, mobile, and desktop software with clear plans, shared milestones, and no surprises.",
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                url: "https://sitehaus.dev/contact",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "SiteHaus",
              url: "https://sitehaus.dev",
            },
          ]}
        />
        <SiteNav />
        <div id="main-content">{children}</div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer
          style={{
            background: "var(--clay-900)",
            color: "var(--parchment-50)",
            padding: "72px 0 40px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Topographic lines */}
          <svg
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.3 }}
            viewBox="0 0 1200 400"
            preserveAspectRatio="none"
          >
            <g stroke="var(--terracotta-500)" strokeWidth="1" fill="none">
              <path d="M0,360 Q300,300 600,360 T1200,360" />
              <path d="M0,330 Q300,260 600,330 T1200,330" />
              <path d="M0,300 Q300,220 600,300 T1200,300" />
              <path d="M0,270 Q300,180 600,270 T1200,270" />
              <path d="M0,240 Q300,140 600,240 T1200,240" />
            </g>
          </svg>

          <div className="container mx-auto px-8" style={{ position: "relative" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: "48px",
                marginBottom: "56px",
              }}
              className="flex-col md:grid"
            >
              {/* Brand */}
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <svg
                    width="22"
                    height="28"
                    viewBox="0 0 193.81 251.25"
                    aria-hidden="true"
                    style={{ fill: "var(--terracotta-300)", flexShrink: 0 }}
                  >
                    <path d="M0,30.14v14.18l62.78,5.85c.36.03.46-.48.12-.58L0,30.14Z" />
                    <path d="M0,64.28l62.78-5.85c.36-.03.46.48.12.58L0,78.46" />
                    <path d="M193.81,30.14v14.18s-62.78,5.85-62.78,5.85c-.36.03-.46-.48-.12-.58l62.89-19.45Z" />
                    <path d="M193.81,64.28l-62.78-5.85c-.36-.03-.46.48-.12.58l62.89,19.45" />
                    <path d="M10.1,232.42s20.28,17.58,48.07,18.64c45.45,1.75,66.03-9.32,101.58-9.32,15.83,0,19.52,1.65,19.52,1.65,0,0-18.45-27.22-47.78-28.94-26.51-1.55-52.92,23.5-78.27,23.79-28.36.33-43.12-5.83-43.12-5.83Z" />
                    <path d="M69.85,83.9l-14.68,145.51c9.63-.73,20.13-5.63,31.2-10.81,13.62-6.37,27.7-12.96,42.73-12.96.97,0,1.95.03,2.9.08,1.19.07,2.37.18,3.53.32l-12.33-122.14s10.49-1.17,10.49-10.88c0-3.37-1.17-5.05-1.17-5.05h-10.62v-24.86h.37c6.73,0,9.59-8.57,4.21-12.61l-23.22-17.43v-7.25C103.26-.26,96.53,0,96.53,0c0,0-6.73-.26-6.73,5.83v7.25l-23.22,17.43c-5.38,4.04-2.53,12.61,4.21,12.61h.37v24.86h-10.62s-1.16,1.68-1.17,5.05c0,9.71,10.49,10.88,10.49,10.88ZM106.42,43.98h8.69v24.47h-8.69v-24.47ZM92.63,43.98h8.69v24.47h-8.69v-24.47ZM92.63,110.02c0-2.41,1.95-4.36,4.35-4.36s4.35,1.95,4.35,4.36v15.53h-8.69v-15.53ZM92.63,155.01c0-2.41,1.95-4.36,4.35-4.36s4.35,1.95,4.35,4.36v15.53h-8.69v-15.53ZM78.72,43.98h8.69v24.47h-8.69v-24.47Z" />
                  </svg>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontVariationSettings: "'opsz' 60, 'SOFT' 50, 'WONK' 1",
                      fontSize: "24px",
                      fontWeight: 500,
                      color: "var(--parchment-50)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    SiteHaus
                  </span>
                </div>
                <p
                  style={{
                    color: "var(--parchment-200)",
                    maxWidth: "340px",
                    lineHeight: 1.65,
                    margin: 0,
                    fontSize: "14px",
                  }}
                >
                  A small consultancy that builds careful software. Clear plans, direct
                  communication, no surprises.
                </p>
              </div>

              {/* Studio links */}
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--terracotta-300)",
                    marginBottom: "14px",
                  }}
                >
                  Studio
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  {[
                    ["Services", "/services"],
                    ["Our Method", "/our-method"],
                    ["Platform", "/platform"],
                    ["About", "/about"],
                    ["Contact", "/contact"],
                  ].map(([label, href]) => (
                    <a
                      key={href}
                      href={href}
                      style={{
                        color: "var(--parchment-200)",
                        fontSize: "14px",
                        textDecoration: "none",
                        transition: "color var(--dur-fast) var(--ease-out)",
                      }}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>

              {/* Legal */}
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--terracotta-300)",
                    marginBottom: "14px",
                  }}
                >
                  Legal
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <a
                    href="/privacy"
                    style={{
                      color: "var(--parchment-200)",
                      fontSize: "14px",
                      textDecoration: "none",
                    }}
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>

            <hr
              style={{
                border: "none",
                borderTop: "1px solid rgba(244, 205, 184, 0.12)",
                margin: 0,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "24px",
                color: "var(--parchment-300)",
                fontSize: "13px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span>&copy; {new Date().getFullYear()} SiteHaus LLC. All rights reserved.</span>
              <span
                style={{
                  fontStyle: "italic",
                  fontFamily: "var(--font-display)",
                  fontVariationSettings: "'opsz' 36, 'SOFT' 80, 'WONK' 1",
                  fontSize: "15px",
                }}
              >
                Carefully made, in Utah.
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
