import { Button } from "@site-haus/ui/components/base/button";
import type { Metadata } from "next";
import {
  CreditCard,
  FileText,
  KeyRound,
  LayoutDashboard,
  MilestoneIcon,
  MoveRight,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Screenshot } from "./screenshot";

export const metadata: Metadata = {
  title: "Platform",
  description:
    "Every SiteHaus client gets access to a workspace we built ourselves — a unified platform for project management, identity, and access control.",
};

const dashboardFeatures = [
  {
    icon: FileText,
    title: "Design Documents",
    description:
      "Every project starts with a fully documented spec — scope, timeline, and pricing — approved before a line of code is written.",
    screenshot: "/dashboard/design-document-mike.png",
    alt: "Design document showing project scope, timeline, and pricing",
  },
  {
    icon: MilestoneIcon,
    title: "Milestones",
    description:
      "Every project is broken into clear milestones. Clients see exactly what's being worked on and what's coming next — no status meetings required.",
    screenshot: "/dashboard/milestone-overview-mike.png",
    alt: "Milestone overview showing project progress",
  },
  {
    icon: CreditCard,
    title: "Billing",
    description:
      "Invoices, subscriptions, and payment history in one place. No surprise charges — everything tied directly to the project it belongs to.",
    screenshot: "/dashboard/billing-mike.png",
    alt: "Billing view showing invoices and payment history",
  },
];

const iamFeatures = [
  {
    icon: ShieldCheck,
    title: "Roles & Permissions",
    description:
      "Fine-grained control over who can do what. Custom roles, granular permissions — managed by your team, not ours.",
    screenshot: "/dashboard/iam-roles-mike.png",
    alt: "Roles and permissions management",
  },
  {
    icon: Settings,
    title: "App Configuration",
    description:
      "OAuth2 client settings, redirect URIs, and consent configuration — all self-service, all in one place.",
    screenshot: "/dashboard/iam-app-settings-mike.png",
    alt: "OAuth app settings and configuration",
  },
  {
    icon: ScrollText,
    title: "Audit Logs",
    description:
      "A full activity trail across your organization. Know exactly what happened, when, and who did it.",
    screenshot: "/dashboard/audit-log-mike.png",
    alt: "Audit log showing recent activity",
  },
];


export default function PlatformPage() {
  return (
    <main className="min-h-screen pt-16">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 md:py-28 border-b border-border/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mb-14 md:mb-20">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
              The SiteHaus platform
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
              Built for us.{" "}
              <span className="italic font-bold text-foreground/50">
                Yours to use.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Every SiteHaus client gets access to a platform we designed and
              built ourselves — not a stitched-together collection of third-party
              tools, but a unified workspace built to the same standard we hold
              our client work to.
            </p>
          </div>

          {/* Establishing shot — full dashboard overview */}
          <Screenshot
            src="/dashboard/dashboard-overview-mike.png"
            alt="SiteHaus client dashboard overview"
            browser
            url="dashboard.sitehaus.dev"
          />
        </div>
      </section>

      {/* ── Client Workspace ─────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-36 border-b border-border/50">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="max-w-xl mb-14 md:mb-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard aria-hidden="true" className="h-4 w-4 text-primary/70" />
              </div>
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
                Client workspace
              </p>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
              Your project, always visible.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A dedicated workspace for every project. Milestones, tickets,
              assets, and documents — all in one place. Clients always know
              exactly where things stand without having to ask.
            </p>
          </div>

          {/* Project overview hero shot */}
          <Screenshot
            src="/dashboard/project-overview-mike.png"
            alt="Project overview showing milestones, status, and billing"
            browser
            url="dashboard.sitehaus.dev"
            className="mb-14 md:mb-20"
          />

          {/* Feature trio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {dashboardFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex flex-col gap-5">
                  <Screenshot
                    src={feature.screenshot}
                    alt={feature.alt}
                    className=""
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon aria-hidden="true" className="h-4 w-4 text-primary/60 flex-shrink-0" />
                      <h3 className="font-bold text-base">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── IAM & Access ─────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 md:py-28 lg:py-36 bg-muted/30 border-b border-border/50">
        <div className="container mx-auto px-6">
          {/* Header */}
          <div className="max-w-xl mb-14 md:mb-20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <KeyRound aria-hidden="true" className="h-4 w-4 text-primary/70" />
              </div>
              <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground">
                Identity & access
              </p>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-5">
              Security that doesn&apos;t get in the way.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A full Identity and Access Management system — OAuth2 PKCE,
              TOTP two-factor auth, role-based permissions, and session
              management. Enterprise-grade security built into every account,
              managed directly by your team.
            </p>
          </div>

          {/* Team overview hero shot */}
          <Screenshot
            src="/dashboard/team-overview-mike.png"
            alt="Team management showing members and their roles"
            browser
            url="iam.sitehaus.dev"
            className="mb-14 md:mb-20"
          />

          {/* Feature trio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {iamFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex flex-col gap-5">
                  <Screenshot
                    src={feature.screenshot}
                    alt={feature.alt}
                    className=""
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon aria-hidden="true" className="h-4 w-4 text-primary/60 flex-shrink-0" />
                      <h3 className="font-bold text-base">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 md:py-28">
        <div className="container mx-auto px-6 max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-muted-foreground mb-4">
            Included with every project
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
            No extra cost. No third-party logins.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed mb-10">
            Every client gets full access to the platform from day one. It&apos;s
            part of how we work — not an upsell.
          </p>
          <Button size="lg" className="h-12 text-base" asChild>
            <Link href="/contact">
              Start a project <MoveRight aria-hidden="true" className="ml-2" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
