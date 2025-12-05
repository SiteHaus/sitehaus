import { schema } from "@site-haus/db";
import { NewClient } from "@site-haus/db/iam/clients";
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
  },
  {
    key: "iam",
    name: "IAM",
    type: "public",
    firstParty: true,
    audience: "sitehaus.iam",
  },
  {
    key: "api",
    name: "API",
    type: "public",
    firstParty: true,
    audience: "sitehaus.api",
  },
  {
    key: "web",
    name: "Marketing",
    type: "public",
    firstParty: true,
    audience: "sitehaus.web",
  },
];
async function seed() {
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.clientsTable)
      .values(CLIENTS as any)
      .onConflictDoNothing({ target: schema.clientsTable.key });

    const clients = await tx.select().from(schema.clientsTable);

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
