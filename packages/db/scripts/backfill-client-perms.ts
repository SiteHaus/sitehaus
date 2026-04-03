/**
 * Backfills missing permissions onto existing non-first-party client roles.
 *
 * Useful when new permissions are added to DEFAULT_ROLE_PERMS — this ensures
 * clients created before the change get the updated defaults.
 *
 * Usage:
 *   cd packages/db && pnpm backfill-client-perms
 */

import { schema } from "@site-haus/db";
import { DEFAULT_ROLE_PERMS } from "@site-haus/validation/core/perms";
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

const ROLE_KEYS = ["admin", "member", "client"] as const;

async function main() {
  // Only target non-first-party clients
  const clients = await db.query.clientsTable.findMany({
    where: (t, { eq: _eq }) => _eq(t.firstParty, false),
    columns: { id: true, name: true },
  });

  console.log(`Found ${clients.length} non-first-party client(s).`);

  for (const client of clients) {
    console.log(`\nClient: ${client.name} (${client.id})`);

    for (const roleKey of ROLE_KEYS) {
      const expectedPerms = DEFAULT_ROLE_PERMS[roleKey] ?? [];
      if (expectedPerms.length === 0) continue;

      const role = await db.query.rolesTable.findFirst({
        where: (t, { and: _and, eq: _eq }) => _and(_eq(t.clientId, client.id), _eq(t.key, roleKey)),
        columns: { id: true, key: true },
      });

      if (!role) {
        console.log(`  ⚠ Role "${roleKey}" not found, skipping.`);
        continue;
      }

      // Find which expected perms are already present
      const existing = await db.query.rolePermissionsTable.findMany({
        where: (t, { and: _and, eq: _eq, inArray: _in }) =>
          _and(_eq(t.roleId, role.id), _in(t.perm, expectedPerms as unknown as string[])),
        columns: { perm: true },
      });

      const existingSet = new Set(existing.map((r) => r.perm));
      const missing = (expectedPerms as readonly string[]).filter((p) => !existingSet.has(p));

      if (missing.length === 0) {
        console.log(`  ✓ Role "${roleKey}" — all permissions present`);
        continue;
      }

      await db
        .insert(schema.rolePermissionsTable)
        .values(missing.map((perm) => ({ roleId: role.id, perm })))
        .onConflictDoNothing();

      console.log(
        `  ✓ Role "${roleKey}" — added ${missing.length} missing perm(s): ${missing.join(", ")}`,
      );
    }
  }

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
