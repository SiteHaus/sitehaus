"use client";

import { Alert, AlertDescription, AlertTitle } from "@site-haus/ui/components/base/alert";
import { Badge } from "@site-haus/ui/components/base/badge";
import { Button } from "@site-haus/ui/components/base/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@site-haus/ui/components/base/card";
import { Input } from "@site-haus/ui/components/base/input";
import { Label } from "@site-haus/ui/components/base/label";
import { Separator } from "@site-haus/ui/components/base/separator";
import { Switch } from "@site-haus/ui/components/base/switch";
import { Textarea } from "@site-haus/ui/components/base/textarea";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bell,
  CheckCircle2,
  CreditCard,
  FolderKanban,
  Info,
  Loader2,
  Plus,
  Settings,
  Sparkles,
  Ticket,
  Zap,
} from "lucide-react";
import { PageHero } from "@site-haus/ui/components/shared/page-hero";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </h2>
        <Separator className="mt-2" />
      </div>
      {children}
    </div>
  );
}

export default function DesignShowcase() {
  return (
    <div className="space-y-12 pb-20">
      <PageHero
        icon={Sparkles}
        title="Design System"
        subtitle="Component showcase and design tokens."
      />

      {/* Color Swatches */}
      <Section title="Color Tokens">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "background", cls: "bg-background border" },
            { label: "card", cls: "bg-card border" },
            { label: "muted", cls: "bg-muted" },
            { label: "secondary", cls: "bg-secondary" },
            { label: "primary", cls: "bg-primary" },
            { label: "destructive", cls: "bg-destructive" },
          ].map(({ label, cls }) => (
            <div key={label} className="space-y-1.5">
              <div className={`h-12 rounded-md ${cls}`} />
              <p className="text-xs text-muted-foreground font-mono">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">border sample</p>
            <div className="h-8 border rounded-md" />
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">ring sample</p>
            <div className="h-8 border-2 border-ring rounded-md" />
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground mb-1">radius = 0.375rem</p>
            <div className="h-8 bg-muted rounded-lg" />
          </Card>
        </div>
      </Section>

      {/* Buttons */}
      <Section title="Buttons">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-3">Variants</p>
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-3">Sizes</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">Large</Button>
              <Button>Default</Button>
              <Button size="sm">Small</Button>
              <Button size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-3">With icons</p>
            <div className="flex flex-wrap gap-3">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
              <Button variant="outline">
                <FolderKanban className="mr-2 h-4 w-4" />
                View Projects
              </Button>
              <Button variant="secondary">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Badges */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="outline">Outline 2</Badge>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge className="gap-1">
            <BadgeCheck className="h-3 w-3" />
            Verified
          </Badge>
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </Badge>
          <Badge variant="warning" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            In Progress
          </Badge>
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Overdue
          </Badge>
        </div>
      </Section>

      {/* Cards */}
      <Section title="Cards">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Stat card */}
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <FolderKanban className="h-3.5 w-3.5" />
                Active Projects
              </CardDescription>
              <CardTitle className="text-2xl">12</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">3 due this week</p>
            </CardContent>
          </Card>

          {/* Stat card — highlighted */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-primary">
                <Zap className="h-3.5 w-3.5" />
                MRR
              </CardDescription>
              <CardTitle className="text-2xl">$4,820</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">↑ 12% from last month</p>
            </CardContent>
          </Card>

          {/* Info card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Current Plan</CardTitle>
              <CardDescription>Your active subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium">Growth — $299/mo</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Next charge</span>
                <span className="font-medium">Mar 15, 2026</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-3">
                <div className="bg-primary rounded-full h-1.5 w-[62%]" />
              </div>
              <p className="text-xs text-muted-foreground">19 days remaining</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                <CreditCard className="mr-2 h-3.5 w-3.5" />
                Manage Billing
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* List card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Recent Tickets</CardTitle>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {[
              {
                title: "Homepage hero section needs copy update",
                type: "Content",
                priority: "normal",
              },
              { title: "Mobile nav broken on Safari 17", type: "Bug", priority: "high" },
              { title: "Add FAQ section to pricing page", type: "Feature", priority: "normal" },
            ].map((ticket, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-3 px-6 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ticket.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ticket.type}</p>
                </div>
                <Badge
                  variant={ticket.priority === "high" ? "destructive" : "outline"}
                  className="shrink-0 text-xs"
                >
                  {ticket.priority === "high" ? "High" : "Normal"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      {/* Alerts */}
      <Section title="Alerts">
        <div className="space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              Your next invoice will be generated on March 15, 2026.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Payment overdue</AlertTitle>
            <AlertDescription>
              You have 2 outstanding payments.{" "}
              <span className="underline font-medium cursor-pointer">View billing</span> to take
              action.
            </AlertDescription>
          </Alert>
          <Alert className="border-primary/30 bg-primary/5">
            <Bell className="h-4 w-4 text-primary" />
            <AlertTitle>Complete your profile</AlertTitle>
            <AlertDescription>
              Tell us about your brand and goals so we can hit the ground running.
            </AlertDescription>
          </Alert>
        </div>
      </Section>

      {/* Form Elements */}
      <Section title="Form Elements">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" placeholder="My awesome project" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" placeholder="Tell us about your project..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="disabled">Disabled field</Label>
              <Input id="disabled" value="Read-only value" disabled />
            </div>
          </div>
          <div className="space-y-4">
            <Card className="p-4 space-y-4">
              <p className="text-sm font-medium">Notification preferences</p>
              {[
                { label: "Email on ticket reply", defaultChecked: true },
                { label: "Milestone sign-off reminders", defaultChecked: true },
                { label: "Weekly project summary", defaultChecked: false },
                { label: "Billing alerts", defaultChecked: true },
              ].map(({ label, defaultChecked }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <Switch defaultChecked={defaultChecked} />
                </div>
              ))}
            </Card>
          </div>
        </div>
      </Section>

      {/* List Rows */}
      <Section title="List Rows">
        <Card>
          <CardContent className="p-0">
            {[
              {
                icon: FolderKanban,
                title: "Brand Refresh & Website Redesign",
                sub: "In Progress · Due Apr 12",
                badge: { label: "In Progress", variant: "warning" as const },
              },
              {
                icon: Ticket,
                title: "E-commerce Integration",
                sub: "Awaiting Feedback · Due May 30",
                badge: { label: "Review", variant: "secondary" as const },
              },
              {
                icon: FolderKanban,
                title: "SEO Content Sprint",
                sub: "Completed · Mar 1",
                badge: { label: "Done", variant: "success" as const },
              },
            ].map(({ icon: Icon, title, sub, badge }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={badge.variant} className="text-xs">
                    {badge.label}
                  </Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>

      {/* Empty States */}
      <Section title="Empty States">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border bg-card">
            <FolderKanban className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No active projects yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your project will appear here once SiteHaus sets it up.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border bg-card">
            <Ticket className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium">No open tickets</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Submit a ticket when you need something.
            </p>
            <Button size="sm">
              <Plus className="mr-2 h-3.5 w-3.5" />
              New Ticket
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
