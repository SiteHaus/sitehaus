/**
 * Demo seed — "Ogden Construction Co."
 *
 * Creates realistic-looking data for screenshots:
 *   - Ogden Construction as an OAuth client
 *   - Three client-side users (Mike, Sarah, Jake)
 *   - Two SiteHaus engineers (Parker, Ethan)
 *   - A website redesign project, in progress
 *   - 5 milestones (2 done, 1 active, 2 upcoming)
 *   - 5 tickets (mix of types, priorities, statuses)
 *   - An approved design document
 *   - A business profile
 *
 * Password for all demo users: Demo1234!
 *
 * Run: pnpm --filter db db:seed-demo
 */

import { hash as argon2Hash } from "@node-rs/argon2";
import { schema } from "@site-haus/db";
import { DEFAULT_ROLE_PERMS } from "@site-haus/validation/core/perms";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

const DEMO_PASSWORD = "Demo1234!";

const ARGON2_OPTS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

// Plate.js JSON format — matches the editor's node schema
const DESIGN_DOC_CONTENT = JSON.stringify([
  { type: "h1", children: [{ text: "Website Redesign — Ogden Construction Co." }] },

  { type: "h2", children: [{ text: "Overview" }] },
  { type: "p", children: [{ text: "Ogden Construction Co. has been serving the Ogden and Northern Utah area since 1987. Their current website is outdated, not mobile-friendly, and doesn't reflect the quality of work they deliver. This project covers a full redesign and rebuild of their marketing website." }] },

  { type: "h2", children: [{ text: "Goals" }] },
  { type: "p", children: [{ text: "• Modernize their brand presence online" }] },
  { type: "p", children: [{ text: "• Showcase completed projects and capabilities" }] },
  { type: "p", children: [{ text: "• Make it easy for potential clients to request quotes" }] },
  { type: "p", children: [{ text: "• Significantly improve the mobile experience" }] },
  { type: "p", children: [{ text: "• Improve local SEO rankings in the Ogden / Weber County area" }] },

  { type: "h2", children: [{ text: "Scope of Work" }] },
  { type: "h3", children: [{ text: "Pages" }] },
  { type: "p", children: [{ text: "1. " }, { text: "Home", bold: true }, { text: " — Hero, services overview, featured projects, testimonials, CTA" }] },
  { type: "p", children: [{ text: "2. " }, { text: "Services", bold: true }, { text: " — Residential, Commercial, Industrial breakdowns" }] },
  { type: "p", children: [{ text: "3. " }, { text: "Project Gallery", bold: true }, { text: " — Filterable photo gallery of completed work" }] },
  { type: "p", children: [{ text: "4. " }, { text: "About", bold: true }, { text: " — Team, company history, certifications, licensing" }] },
  { type: "p", children: [{ text: "5. " }, { text: "Contact", bold: true }, { text: " — Quote request form, phone, address, service area map" }] },

  { type: "h3", children: [{ text: "Technical Requirements" }] },
  { type: "p", children: [{ text: "• Built on Next.js with Sanity CMS for client content management" }] },
  { type: "p", children: [{ text: "• Mobile-first responsive design" }] },
  { type: "p", children: [{ text: "• Contact form connected to company email" }] },
  { type: "p", children: [{ text: "• Google Maps integration for service area" }] },
  { type: "p", children: [{ text: "• SEO setup (sitemap, meta tags, Open Graph)" }] },
  { type: "p", children: [{ text: "• Hosted on Vercel" }] },

  { type: "h3", children: [{ text: "CMS Content Types" }] },
  { type: "p", children: [{ text: "Mike and Sarah will be able to manage the following content directly from the Sanity Studio without developer involvement:" }] },
  { type: "p", children: [{ text: "• Project gallery entries (title, photos, category, description)" }] },
  { type: "p", children: [{ text: "• Testimonials" }] },
  { type: "p", children: [{ text: "• Team member bios" }] },
  { type: "p", children: [{ text: "• Service area updates" }] },

  { type: "h2", children: [{ text: "Timeline" }] },
  { type: "p", children: [{ text: "Discovery & Design Document", bold: true }, { text: " — ✅ Complete — Feb 14, 2026" }] },
  { type: "p", children: [{ text: "Brand & Design System", bold: true }, { text: " — ✅ Complete — Feb 28, 2026" }] },
  { type: "p", children: [{ text: "Website Development", bold: true }, { text: " — 🔄 In Progress — Mar 21, 2026" }] },
  { type: "p", children: [{ text: "Review & QA", bold: true }, { text: " — ⏳ Upcoming — Mar 28, 2026" }] },
  { type: "p", children: [{ text: "Launch", bold: true }, { text: " — ⏳ Upcoming — Apr 4, 2026" }] },

  { type: "h2", children: [{ text: "Pricing" }] },
  { type: "p", children: [{ text: "Project total: $8,500" }] },
  { type: "p", children: [{ text: "Deposit (due at approval): $2,500" }] },
  { type: "p", children: [{ text: "Final payment (due at launch): $6,000" }] },
  { type: "p", children: [{ text: "Optional monthly maintenance: $150/mo" }] },

  { type: "h2", children: [{ text: "Out of Scope" }] },
  { type: "p", children: [{ text: "The following are explicitly not included in this engagement:" }] },
  { type: "p", children: [{ text: "• E-commerce or online payment processing" }] },
  { type: "p", children: [{ text: "• Customer portal or user account system" }] },
  { type: "p", children: [{ text: "• Blog or news section (can be scoped as a Phase 2 addition)" }] },
  { type: "p", children: [{ text: "• Logo redesign — existing logo will be refined and used as-is" }] },

  { type: "h2", children: [{ text: "Approval" }] },
  { type: "blockquote", children: [{ text: "By approving this document, Ogden Construction Co. confirms that the scope, timeline, and pricing above accurately reflect the agreed engagement." }] },
]);

async function seed() {
  const passwordHash = await argon2Hash(DEMO_PASSWORD, ARGON2_OPTS);
  const now = new Date();

  await db.transaction(async (tx) => {
    // ── 1. Ogden Construction OAuth client ─────────────────────────────
    await tx
      .insert(schema.clientsTable)
      .values({
        key: "ogden-construction",
        name: "Ogden Construction Co.",
        type: "public",
        firstParty: false,
        audience: "ogdenconstruction.com",
        requiresConsent: true,
      } as any)
      .onConflictDoNothing({ target: schema.clientsTable.key });

    const ogden = await tx.query.clientsTable.findFirst({
      where: (t, { eq }) => eq(t.key, "ogden-construction"),
    });

    if (!ogden) throw new Error("Ogden Construction client not found");

    // ── 2. Roles for Ogden Construction ────────────────────────────────
    await tx
      .insert(schema.rolesTable)
      .values([
        {
          clientId: ogden.id,
          key: "admin",
          name: "Admin",
          isDefault: false,
        },
        {
          clientId: ogden.id,
          key: "member",
          name: "Member",
          isDefault: true,
        },
      ])
      .onConflictDoNothing({
        target: [schema.rolesTable.clientId, schema.rolesTable.key],
      });

    // Assign permissions to roles (reuse DEFAULT_ROLE_PERMS from main seed)
    const allPerms = await tx.select().from(schema.permissionsCatalogTable);
    if (allPerms.length > 0) {
      const ogdenRoles = await tx.query.rolesTable.findMany({
        where: (t, { eq }) => eq(t.clientId, ogden.id),
      });
      const adminRole = ogdenRoles.find((r) => r.key === "admin");
      const memberRole = ogdenRoles.find((r) => r.key === "member");

      if (adminRole) {
        await tx
          .insert(schema.rolePermissionsTable)
          .values(
            DEFAULT_ROLE_PERMS.admin.map((perm) => ({
              roleId: adminRole.id,
              perm,
            })),
          )
          .onConflictDoNothing();
      }
      if (memberRole) {
        await tx
          .insert(schema.rolePermissionsTable)
          .values(
            DEFAULT_ROLE_PERMS.member.map((perm) => ({
              roleId: memberRole.id,
              perm,
            })),
          )
          .onConflictDoNothing();
      }
    }

    const ogdenRoles = await tx.query.rolesTable.findMany({
      where: (t, { eq }) => eq(t.clientId, ogden.id),
    });
    const adminRole = ogdenRoles.find((r) => r.key === "admin")!;
    const memberRole = ogdenRoles.find((r) => r.key === "member")!;

    // ── 3. Users ────────────────────────────────────────────────────────
    const usersToCreate = [
      // SiteHaus engineers
      {
        email: "parker@sitehaus.dev",
        firstName: "Parker",
        lastName: "Nance",
        isVerified: true,
        emailVerifiedAt: now,
      },
      {
        email: "ethan@sitehaus.dev",
        firstName: "Ethan",
        lastName: "Bell",
        isVerified: true,
        emailVerifiedAt: now,
      },
      // Ogden Construction team
      {
        email: "mike@ogdenconstruction.com",
        firstName: "Mike",
        lastName: "Jensen",
        isVerified: true,
        emailVerifiedAt: now,
      },
      {
        email: "sarah@ogdenconstruction.com",
        firstName: "Sarah",
        lastName: "Cooper",
        isVerified: true,
        emailVerifiedAt: now,
      },
      {
        email: "jake@ogdenconstruction.com",
        firstName: "Jake",
        lastName: "Torres",
        isVerified: true,
        emailVerifiedAt: now,
      },
    ];

    await tx
      .insert(schema.usersTable)
      .values(usersToCreate as any)
      .onConflictDoNothing({ target: schema.usersTable.email });

    // Fetch all users by email
    const users = await tx.query.usersTable.findMany({
      where: (t, { inArray }) =>
        inArray(
          t.email,
          usersToCreate.map((u) => u.email),
        ),
    });

    const byEmail = new Map(users.map((u) => [u.email, u]));
    const parker = byEmail.get("parker@sitehaus.dev")!;
    const ethan = byEmail.get("ethan@sitehaus.dev")!;
    const mike = byEmail.get("mike@ogdenconstruction.com")!;
    const sarah = byEmail.get("sarah@ogdenconstruction.com")!;
    const jake = byEmail.get("jake@ogdenconstruction.com")!;

    // ── 4. Password credentials ─────────────────────────────────────────
    await tx
      .insert(schema.passwordCredentialsTable)
      .values(
        users.map((u) => ({
          userId: u.id,
          passwordHash,
          version: "argon2id-1",
        })),
      )
      .onConflictDoNothing();

    // ── 5. User roles (Ogden Construction client) ───────────────────────
    await tx
      .insert(schema.userRolesTable)
      .values([
        { userId: mike.id, clientId: ogden.id, roleId: adminRole.id },
        { userId: sarah.id, clientId: ogden.id, roleId: adminRole.id },
        { userId: jake.id, clientId: ogden.id, roleId: memberRole.id },
      ])
      .onConflictDoNothing();

    // ── 6. Business profile ─────────────────────────────────────────────
    await tx
      .insert(schema.businessProfilesTable)
      .values({
        clientId: ogden.id,
        businessName: "Ogden Construction Co.",
        industry: "General Contracting",
        description:
          "Family-owned general contractor serving the Ogden and Northern Utah area since 1987. Specializing in residential remodels, commercial builds, and industrial projects.",
        targetAudience:
          "Homeowners, local businesses, and industrial property owners in Weber and Davis counties.",
        goals:
          "Generate more inbound leads online, showcase recent projects, and make it easy for potential clients to request a quote.",
        painPoints:
          "Current website is outdated and not mobile-friendly. No way to manage content without a developer. Low visibility in local search results.",
        brandColors: JSON.stringify(["#1a2e4a", "#c8922a", "#f5f0e8"]),
        competitors: "Hansen Construction, Wasatch Builders, Utah Home Pros",
        hasLogo: true,
      } as any)
      .onConflictDoNothing();

    // ── 7. Project ──────────────────────────────────────────────────────
    await tx
      .insert(schema.projectsTable)
      .values({
        clientId: ogden.id,
        userId: parker.id,
        name: "Website Redesign",
        description:
          "Full redesign and rebuild of the Ogden Construction Co. marketing website. Mobile-first, CMS-powered, SEO-optimized.",
        status: "in_progress",
        type: "marketing",
        siteDomain: "ogdenconstruction.com",
        stagingDomain: "staging.ogdenconstruction.com",
        startDate: new Date("2026-02-10"),
        dueDate: new Date("2026-04-04"),
        monthlyRateCents: 15000,
        depositAmountCents: 250000,
        billingStatus: "paid",
      } as any)
      .onConflictDoNothing();

    const project = await tx.query.projectsTable.findFirst({
      where: (t, { eq, and }) =>
        and(eq(t.clientId, ogden.id), eq(t.name, "Website Redesign")),
    });

    if (!project) throw new Error("Project not found after insert");

    // ── 8. Milestones ────────────────────────────────────────────────────
    await tx
      .insert(schema.milestonesTable)
      .values([
        {
          projectId: project.id,
          name: "Discovery & Design Document",
          description:
            "Intake meeting, research, and full design document. Approved by client before any work begins.",
          status: "completed",
          sortOrder: 1,
          dueDate: new Date("2026-02-14"),
          assigneeId: parker.id,
          completedAt: new Date("2026-02-13"),
          signedOffAt: new Date("2026-02-14"),
          signedOffBy: mike.id,
        },
        {
          projectId: project.id,
          name: "Brand & Design System",
          description:
            "Typography, color palette, component library, and full Figma mockups for all pages.",
          status: "completed",
          sortOrder: 2,
          dueDate: new Date("2026-02-28"),
          assigneeId: ethan.id,
          completedAt: new Date("2026-02-26"),
          signedOffAt: new Date("2026-02-27"),
          signedOffBy: sarah.id,
        },
        {
          projectId: project.id,
          name: "Website Development",
          description:
            "Full build of all pages and CMS integration. Staging deployment for client review.",
          status: "in_progress",
          sortOrder: 3,
          dueDate: new Date("2026-03-21"),
          assigneeId: parker.id,
        },
        {
          projectId: project.id,
          name: "Review & QA",
          description:
            "Cross-browser and cross-device testing, content review with client, performance audit.",
          status: "not_started",
          sortOrder: 4,
          dueDate: new Date("2026-03-28"),
          assigneeId: ethan.id,
        },
        {
          projectId: project.id,
          name: "Launch",
          description:
            "DNS cutover, production deployment, final walkthrough, and handoff to client.",
          status: "not_started",
          sortOrder: 5,
          dueDate: new Date("2026-04-04"),
          assigneeId: parker.id,
        },
      ] as any)
      .onConflictDoNothing();

    // ── 9. Tickets ────────────────────────────────────────────────────────
    await tx
      .insert(schema.ticketsTable)
      .values([
        {
          projectId: project.id,
          title: "Add 2024 project photos to gallery",
          description:
            "Mike has a batch of photos from the Henderson Ave commercial build. Need to upload and add to the project gallery section once CMS is ready.",
          type: "request",
          priority: "normal",
          status: "open",
          authorId: mike.id,
          assigneeId: parker.id,
        },
        {
          projectId: project.id,
          title: "Contact form not sending emails on staging",
          description:
            "Filled out the quote request form on staging.ogdenconstruction.com and didn't receive anything. Tested three times with different email addresses.",
          type: "bug",
          priority: "high",
          status: "in_progress",
          authorId: sarah.id,
          assigneeId: parker.id,
        },
        {
          projectId: project.id,
          title: "Add a testimonials section to the homepage",
          description:
            "We have about 12 great Google reviews we'd like to feature. Can we add a section between the services and the contact CTA?",
          type: "request",
          priority: "normal",
          status: "open",
          authorId: mike.id,
          assigneeId: ethan.id,
        },
        {
          projectId: project.id,
          title: "Mobile nav overlaps logo on iPhone SE",
          description:
            "On a 375px viewport the hamburger menu icon sits on top of the logo text. Reproducible on both Safari and Chrome.",
          type: "bug",
          priority: "urgent",
          status: "resolved",
          authorId: sarah.id,
          assigneeId: ethan.id,
          closedAt: new Date("2026-02-25"),
        },
        {
          projectId: project.id,
          title: "Should we add a blog section?",
          description:
            "Thinking it could help with SEO — we could post project spotlights and tips for homeowners. Is this in scope or would it be a phase 2 thing?",
          type: "question",
          priority: "low",
          status: "closed",
          authorId: jake.id,
          assigneeId: parker.id,
          closedAt: new Date("2026-02-20"),
        },
      ] as any)
      .onConflictDoNothing();

    // ── 10. Design document ────────────────────────────────────────────────
    await tx
      .insert(schema.designDocumentsTable)
      .values({
        projectId: project.id,
        content: DESIGN_DOC_CONTENT,
        status: "approved",
        currentVersion: 2,
        approvedAt: new Date("2026-02-14"),
        approvedBy: mike.id,
        createdBy: parker.id,
      } as any)
      .onConflictDoNothing();
  });

  console.log("✅ Demo seed complete.");
  console.log("   Password for all demo users: Demo1234!");
  console.log("   Users created:");
  console.log("     parker@sitehaus.dev");
  console.log("     ethan@sitehaus.dev");
  console.log("     mike@ogdenconstruction.com");
  console.log("     sarah@ogdenconstruction.com");
  console.log("     jake@ogdenconstruction.com");
}

seed()
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  })
  .finally(() => pool.end());
