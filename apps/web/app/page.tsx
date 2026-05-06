import { Button } from "@site-haus/ui/components/base/button";
import type { Metadata } from "next";
import {
  FileText,
  KeyRound,
  LayoutDashboard,
  Mail,
  MoveRight,
  Paperclip,
  ScrollText,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "SiteHaus — Custom Software Development in Utah",
  description:
    "Custom software development studio in Utah. We build web, mobile, and desktop software for businesses in Ogden, Salt Lake City, and St. George.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "SiteHaus — Custom Software Development in Utah",
    description:
      "Custom software development studio in Utah. We build web, mobile, and desktop software for businesses in Ogden, Salt Lake City, and St. George.",
    url: "/",
  },
  twitter: {
    title: "SiteHaus — Custom Software Development in Utah",
    description:
      "Custom software development studio in Utah. We build web, mobile, and desktop software for businesses in Ogden, Salt Lake City, and St. George.",
  },
};

const platform = [
  {
    icon: LayoutDashboard,
    title: "Client Dashboard",
    description:
      "A dedicated workspace for every project — milestones, tickets, assets, and updates in one place. Clients always know exactly where things stand.",
  },
  {
    icon: FileText,
    title: "Design Documents",
    description:
      "Every project starts with a comprehensive spec. Scope, features, timeline, and cost — all agreed on before any code is written.",
  },
  {
    icon: Paperclip,
    title: "Asset Management",
    description:
      "Uploads, files, and shared deliverables — organized alongside your project. Everything in one place, always accessible.",
  },
  {
    icon: KeyRound,
    title: "OAuth2 & IAM",
    description:
      "A full Identity and Access Management system with OAuth2 PKCE. Secure, standards-compliant authentication across every app we build.",
  },
  {
    icon: ShieldCheck,
    title: "Two-Factor Auth",
    description:
      "TOTP-based 2FA baked into every account. Security isn't an add-on — it's part of the foundation.",
  },
  {
    icon: Users,
    title: "Team Management",
    description:
      "Roles, permissions, and invites. Granular control over who has access to what, without the complexity.",
  },
  {
    icon: ScrollText,
    title: "Audit Logs",
    description:
      "A full activity trail across your organization. Know what happened, when, and who did it.",
  },
  {
    icon: ShoppingBag,
    title: "Commerce Platform",
    description:
      "A multi-tenant ecommerce API with Stripe Connect payments, inventory management, and a full admin interface. Launch stores without stitching together third-party services.",
  },
  {
    icon: Mail,
    title: "Transactional Email",
    description:
      "Branded email templates for every touchpoint — invites, receipts, notifications. Built with React Email and delivered reliably.",
  },
];

const values = [
  {
    title: "Responsible Delivery",
    description:
      "We will always treat Performance, Security, Reliability, and Maintainability as first-class concerns.",
    image: "/Responsible_Delivery_500p_Textured_V1.png",
    alt: "Sailor giving a thumbs up from a sailboat",
    rotate: "-5deg",
  },
  {
    title: "Modern Stack",
    description:
      "We don't just ship features, we build maintainable systems. Modern tech stacks, security best practices, and infrastructure that scales with your needs.",
    image: "/Modern_Stack_500p_Textured_V1.png",
    alt: "Sailor at the helm of a modern yacht",
    rotate: "4deg",
  },
  {
    title: "Clear Scope & Communication",
    description:
      "We start every project with a comprehensive design document and milestone plan. You'll know exactly what you're getting, what it costs, and when to expect it before any code is written.",
    image: "/Clear_Scope_500p_Textured_V1.png",
    alt: "Sailor tying a letter to a seagull's foot",
    rotate: "-3deg",
  },
  {
    title: "Long-Term Partners",
    description:
      "You own everything we build. Full source code, documentation, and deployment knowledge transfer. Whether you want to maintain it in-house or partner with us long-term, the choice is always yours.",
    image: "/Long-Term_Partners_Textured_500p_V1.png",
    alt: "Sailor embracing a lighthouse",
    rotate: "5deg",
  },
];

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background image */}
        <Image
          src="/sitehaus-hero.png"
          alt="SiteHaus — coastal lighthouse illustration"
          fill
          loading="lazy"
          className="object-cover -z-10 hidden sm:block"
          style={{ filter: "brightness(0.9) saturate(0.88)" }}
        />
        <Image
          src="/sitehaus-hero-sm.png"
          alt="SiteHaus — coastal lighthouse illustration"
          fill
          priority
          className="object-cover -z-10 sm:hidden"
          style={{ filter: "brightness(0.9) saturate(0.88)" }}
        />

        {/* Warm parchment vignette — anchors text on the left */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(251,246,238,0.72) 0%, rgba(251,246,238,0.28) 55%, transparent 100%)",
          }}
        />

        <div className="container mx-auto h-full flex items-center px-6 sm:px-8">
          <div className="flex flex-col z-10 max-w-2xl">
            <span className="eyebrow mb-5" style={{ display: "inline-block" }}>
              Available for new projects
            </span>

            <h1
              className="display-heading"
              style={{
                fontSize: "clamp(44px, 5.8vw, 82px)",
                marginBottom: "24px",
              }}
            >
              Your <em>long-term</em>
              <br />
              <em>partner</em> in software
            </h1>

            <p
              style={{
                fontSize: "clamp(16px, 1.4vw, 19px)",
                lineHeight: 1.65,
                color: "var(--clay-700)",
                maxWidth: "460px",
                marginBottom: "36px",
              }}
            >
              We design and build web, mobile, and desktop software for businesses in Utah — with
              clear plans, shared milestones, and software built to be owned.
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <Button size="lg" className="h-11 text-sm shadow-sm" asChild>
                <Link href="/contact">
                  Start a project <MoveRight className="ml-1.5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 text-sm" asChild>
                <Link href="/our-method">How we work</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center"
        >
          <div
            className="animate-bounce rounded-full px-3 py-2"
            style={{
              border: "1px solid var(--line)",
              background: "rgba(251, 246, 238, 0.5)",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--clay-500)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────── */}
      <section style={{ padding: "96px 0" }}>
        <div className="container mx-auto px-8">
          <div style={{ marginBottom: "64px" }}>
            <span className="eyebrow">Our commitments</span>
            <h2
              className="section-heading"
              style={{ fontSize: "clamp(32px, 3.5vw, 48px)", marginTop: "12px" }}
            >
              What we stand for.
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {values.map((value, i) => (
              <div key={value.title}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: i % 2 === 0 ? "row" : "row-reverse",
                    alignItems: "center",
                    gap: "80px",
                    padding: "56px 0",
                  }}
                  className="flex-col-reverse! md:flex-row! gap-10! md:gap-[80px]!"
                >
                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="eyebrow" style={{ fontSize: "11px" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className="section-heading"
                      style={{
                        fontSize: "clamp(24px, 2.5vw, 36px)",
                        marginTop: "10px",
                        marginBottom: "16px",
                      }}
                    >
                      {value.title.charAt(0).toUpperCase() + value.title.slice(1)}
                    </h3>
                    <p
                      style={{
                        fontSize: "17px",
                        lineHeight: 1.7,
                        color: "var(--clay-700)",
                        maxWidth: "480px",
                      }}
                    >
                      {value.description}
                    </p>
                  </div>

                  {/* Image */}
                  <div style={{ flexShrink: 0 }}>
                    <Image
                      src={value.image}
                      alt={value.alt}
                      width={280}
                      height={280}
                      style={{
                        width: "clamp(180px, 20vw, 260px)",
                        height: "auto",
                        rotate: value.rotate,
                        filter: "drop-shadow(0 20px 40px rgba(60, 42, 32, 0.14))",
                        transition: "rotate 400ms var(--ease-out)",
                      }}
                    />
                  </div>
                </div>

                {i < values.length - 1 && (
                  <div
                    aria-hidden="true"
                    style={{ height: "1px", background: "var(--line-soft)", margin: 0 }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform ─────────────────────────────────────────────────── */}
      <section
        className="bg-dotted"
        style={{ padding: "96px 0", background: "var(--parchment-100)" }}
      >
        <div className="container mx-auto px-8">
          <div style={{ maxWidth: "680px", marginBottom: "56px" }}>
            <span className="eyebrow">The SiteHaus platform</span>
            <h2
              className="section-heading"
              style={{
                fontSize: "clamp(32px, 3.5vw, 48px)",
                marginTop: "12px",
                marginBottom: "16px",
              }}
            >
              We built the tools <em>we use</em>.
            </h2>
            <p style={{ fontSize: "17px", lineHeight: 1.65, color: "var(--clay-700)" }}>
              Every client gets access to a platform we designed and built ourselves — not a
              collection of third-party tools, but a unified system held to the same standard as our
              client work.
            </p>
          </div>

          {/* Feature index */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "0 48px",
              marginBottom: "56px",
            }}
            className="grid-cols-1! sm:grid-cols-2! lg:grid-cols-3!"
          >
            {platform.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  style={{
                    padding: "28px 0",
                    borderTop: "1px dashed var(--line)",
                  }}
                >
                  <Icon
                    aria-hidden="true"
                    style={{
                      width: "17px",
                      height: "17px",
                      color: "var(--terracotta-500)",
                      display: "block",
                      marginBottom: "12px",
                    }}
                  />
                  <h3
                    style={{
                      fontFamily: "var(--font-display)",
                      fontVariationSettings: "'opsz' 24, 'SOFT' 30, 'WONK' 0",
                      fontSize: "17px",
                      fontWeight: 500,
                      color: "var(--ink-900)",
                      marginBottom: "10px",
                      letterSpacing: "-0.01em",
                      lineHeight: 1.3,
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.7,
                      color: "var(--clay-700)",
                      margin: 0,
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Button size="lg" className="h-11 text-sm" asChild>
              <Link href="/contact">
                Start a project <MoveRight aria-hidden="true" className="ml-1.5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-11 text-sm" asChild>
              <Link href="/platform">Explore the platform</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── CTA block ────────────────────────────────────────────────── */}
      <section
        className="bg-dotted"
        style={{
          padding: "88px 0 96px",
          backgroundColor: "var(--parchment-100)",
          borderTop: "1px dashed var(--line-soft)",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "580px", margin: "0 auto", padding: "0 32px" }}>
          <svg
            width="80"
            height="10"
            viewBox="0 0 600 12"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ display: "block", margin: "0 auto 28px", color: "var(--terracotta-500)" }}
          >
            <path
              d="M0,6 Q15,0 30,6 T60,6 T90,6 T120,6 T150,6 T180,6 T210,6 T240,6 T270,6 T300,6 T330,6 T360,6 T390,6 T420,6 T450,6 T480,6 T510,6 T540,6 T570,6 T600,6"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
          <h2
            className="section-heading"
            style={{ fontSize: "clamp(32px, 4vw, 52px)", marginBottom: "18px" }}
          >
            Got something you&rsquo;re trying to <em>build</em>?
          </h2>
          <p
            style={{
              fontSize: "17px",
              lineHeight: 1.65,
              color: "var(--clay-700)",
              maxWidth: "440px",
              margin: "0 auto 32px",
            }}
          >
            We read every email. Tell us about your project — we&rsquo;ll write back within a day.
          </p>
          <Link
            href="/contact"
            className="cta-pill-link"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontFamily: "var(--font-body)",
              fontSize: "15px",
              fontWeight: 500,
              padding: "12px 24px",
              borderRadius: "999px",
              background: "var(--terracotta-500)",
              color: "var(--parchment-50)",
              textDecoration: "none",
            }}
          >
            Say hello →
          </Link>
        </div>
      </section>
    </main>
  );
}
