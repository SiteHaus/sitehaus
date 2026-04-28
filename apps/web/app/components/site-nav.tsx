"use client";

import { MoveRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { text: "Services", href: "/services" },
  { text: "Our Method", href: "/our-method" },
  { text: "Platform", href: "/platform" },
  { text: "About", href: "/about" },
];

function SiteLogo({
  size = 26,
  color = "var(--terracotta-500)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size * 0.77}
      height={size}
      viewBox="0 0 193.81 251.25"
      aria-hidden="true"
      style={{ fill: color, flexShrink: 0 }}
    >
      <path d="M0,30.14v14.18l62.78,5.85c.36.03.46-.48.12-.58L0,30.14Z" />
      <path d="M0,64.28l62.78-5.85c.36-.03.46.48.12.58L0,78.46" />
      <path d="M193.81,30.14v14.18s-62.78,5.85-62.78,5.85c-.36.03-.46-.48-.12-.58l62.89-19.45Z" />
      <path d="M193.81,64.28l-62.78-5.85c-.36-.03-.46.48-.12.58l62.89,19.45" />
      <path d="M10.1,232.42s20.28,17.58,48.07,18.64c45.45,1.75,66.03-9.32,101.58-9.32,15.83,0,19.52,1.65,19.52,1.65,0,0-18.45-27.22-47.78-28.94-26.51-1.55-52.92,23.5-78.27,23.79-28.36.33-43.12-5.83-43.12-5.83Z" />
      <path d="M69.85,83.9l-14.68,145.51c9.63-.73,20.13-5.63,31.2-10.81,13.62-6.37,27.7-12.96,42.73-12.96.97,0,1.95.03,2.9.08,1.19.07,2.37.18,3.53.32l-12.33-122.14s10.49-1.17,10.49-10.88c0-3.37-1.17-5.05-1.17-5.05h-10.62v-24.86h.37c6.73,0,9.59-8.57,4.21-12.61l-23.22-17.43v-7.25C103.26-.26,96.53,0,96.53,0c0,0-6.73-.26-6.73,5.83v7.25l-23.22,17.43c-5.38,4.04-2.53,12.61,4.21,12.61h.37v24.86h-10.62s-1.16,1.68-1.17,5.05c0,9.71,10.49,10.88,10.49,10.88ZM106.42,43.98h8.69v24.47h-8.69v-24.47ZM92.63,43.98h8.69v24.47h-8.69v-24.47ZM92.63,110.02c0-2.41,1.95-4.36,4.35-4.36s4.35,1.95,4.35,4.36v15.53h-8.69v-15.53ZM92.63,155.01c0-2.41,1.95-4.36,4.35-4.36s4.35,1.95,4.35,4.36v15.53h-8.69v-15.53ZM78.72,43.98h8.69v24.47h-8.69v-24.47Z" />
    </svg>
  );
}

export const SiteNav = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Desktop + mobile capsule ──────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        style={{
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: "20px",
          padding: "9px 10px 9px 20px",
          background: "rgba(251, 246, 238, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--line-soft)",
          borderRadius: "999px",
          boxShadow: "var(--shadow-sm)",
          whiteSpace: "nowrap",
        }}
      >
        {/* Logo + wordmark */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none" }}
        >
          <SiteLogo size={26} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontVariationSettings: "'opsz' 36, 'SOFT' 50, 'WONK' 1",
              fontSize: "19px",
              fontWeight: 500,
              color: "var(--ink-900)",
              letterSpacing: "-0.01em",
            }}
          >
            SiteHaus
          </span>
        </Link>

        {/* Separator + desktop links */}
        <div
          aria-hidden="true"
          className="hidden md:block"
          style={{ width: "1px", height: "20px", background: "var(--line)" }}
        />
        <div className="hidden md:flex" style={{ gap: "4px" }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                fontWeight: 500,
                padding: "6px 13px",
                borderRadius: "999px",
                color: "var(--clay-700)",
                textDecoration: "none",
                transition:
                  "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--parchment-200)";
                (e.currentTarget as HTMLElement).style.color = "var(--ink-900)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--clay-700)";
              }}
            >
              {link.text}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <Link
          href="/contact"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "14px",
            fontWeight: 500,
            padding: "8px 16px",
            borderRadius: "999px",
            background: "var(--terracotta-500)",
            color: "var(--parchment-50)",
            textDecoration: "none",
            transition:
              "background var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out)",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--terracotta-600)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--terracotta-500)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          Start A Project <MoveRight className="h-4 w-4" />
        </Link>

        {/* Mobile hamburger */}
        <button
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="nav-hamburger"
          onClick={() => setOpen((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "var(--clay-700)",
          }}
        >
          {open ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="3" y1="7" x2="21" y2="7" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="17" x2="21" y2="17" />
            </svg>
          )}
        </button>
      </nav>

      {/* ── Mobile menu overlay ──────────────────────────────────── */}
      {open && (
        <div
          id="mobile-menu"
          role="dialog"
          aria-label="Mobile navigation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99,
            background: "var(--parchment-50)",
            display: "flex",
            flexDirection: "column",
            padding: "96px 32px 48px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            {[...navLinks, { text: "Contact", href: "/contact" }].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: "var(--font-display)",
                  fontVariationSettings: "'opsz' 48, 'SOFT' 50, 'WONK' 0",
                  fontSize: "32px",
                  fontWeight: 400,
                  color: "var(--ink-900)",
                  textDecoration: "none",
                  padding: "12px 0",
                  letterSpacing: "-0.01em",
                  borderBottom: "1px dashed var(--line-soft)",
                }}
              >
                {link.text}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
