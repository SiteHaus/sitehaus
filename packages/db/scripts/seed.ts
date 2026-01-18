import { schema } from "@site-haus/db";
import { NewClient, NewClientRedirectUri } from "@site-haus/db/iam/clients";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMS,
} from "@site-haus/validation/core/perms";

const CLIENTS: NewClient[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    type: "public",
    firstParty: true,
    audience: "sitehaus.dashboard",
    requiresConsent: true, // Enable consent screen for testing
  },
  {
    key: "iam",
    name: "IAM",
    type: "public",
    firstParty: true,
    audience: "sitehaus.iam",
    requiresConsent: false,
  },
  {
    key: "api",
    name: "API",
    type: "public",
    firstParty: true,
    audience: "sitehaus.api",
    requiresConsent: false,
  },
  {
    key: "web",
    name: "Marketing",
    type: "public",
    firstParty: true,
    audience: "sitehaus.web",
    requiresConsent: false,
  },
];

// Redirect URIs for OAuth clients (keyed by client key)
const CLIENT_REDIRECT_URIS: Record<string, string[]> = {
  dashboard: [
    "http://localhost:3001/callback",
    "http://localhost:3001/auth/callback",
    "https://dashboard.sitehaus.dev/callback",
    "https://dashboard.sitehaus.dev/auth/callback",
  ],
  iam: [
    "http://localhost:3002/callback",
    "http://localhost:3002/auth/callback",
    "https://iam.sitehaus.dev/callback",
    "https://iam.sitehaus.dev/auth/callback",
  ],
  web: [
    "http://localhost:3000/callback",
    "http://localhost:3000/auth/callback",
    "https://sitehaus.dev/callback",
    "https://sitehaus.dev/auth/callback",
  ],
};
async function seed() {
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.clientsTable)
      .values(CLIENTS as any)
      .onConflictDoNothing({ target: schema.clientsTable.key });

    const clients = await tx.select().from(schema.clientsTable);

    // Insert redirect URIs for OAuth clients
    for (const client of clients) {
      const uris = CLIENT_REDIRECT_URIS[client.key];
      if (uris && uris.length > 0) {
        await tx
          .insert(schema.clientRedirectUrisTable)
          .values(uris.map((uri) => ({ clientId: client.id, uri })))
          .onConflictDoNothing();
      }
    }

    await tx
      .insert(schema.permissionsCatalogTable)
      .values(ALL_PERMISSIONS.map((perm) => ({ perm })))
      .onConflictDoNothing();

    for (const c of clients) {
      await tx
        .insert(schema.rolesTable)
        .values([
          { clientId: c.id, key: "admin", name: "Admin", isDefault: false },
          { clientId: c.id, key: "member", name: "Member", isDefault: true },
        ])
        .onConflictDoNothing({
          target: [schema.rolesTable.clientId, schema.rolesTable.key],
        });

      const roles = await tx.query.rolesTable.findMany({
        where: (t, { eq, and }) => and(eq(t.clientId, c.id)),
      });

      const admin = roles.find((r) => r.key === "admin");
      const member = roles.find((r) => r.key === "member");
      if (!admin || !member) continue;

      await tx
        .insert(schema.rolePermissionsTable)
        .values(
          DEFAULT_ROLE_PERMS.admin.map((perm) => ({ roleId: admin.id, perm }))
        )
        .onConflictDoNothing();

      await tx
        .insert(schema.rolePermissionsTable)
        .values(
          DEFAULT_ROLE_PERMS.member.map((perm) => ({ roleId: member.id, perm }))
        )
        .onConflictDoNothing();
    }
  });

  console.log("<SITEHAUS SEED - LOG>: Seed completed");
}

seed()
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  })
  .finally(() => pool.end());
