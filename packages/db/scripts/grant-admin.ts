import { schema } from "@site-haus/db";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

const ADMIN_EMAIL = process.env.SITEHAUS_ADMIN_EMAIL ?? "you@sitehaus.dev";
const CLIENT_KEY = process.env.SITEHAUS_ADMIN_CLIENT_KEY ?? "all";
const ADMIN_ROLE_KEY = process.env.SITEHAUS_ADMIN_ROLE_KEY ?? "admin";

async function grantOnClient(
  userId: string,
  email: string,
  clientKey: string,
) {
  const client = await db.query.clientsTable.findFirst({
    where: (t, { eq }) => eq(t.key, clientKey),
  });

  if (!client) {
    console.warn(`  ⚠ Client key="${clientKey}" not found, skipping.`);
    return;
  }

  const role = await db.query.rolesTable.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.clientId, client.id), eq(t.key, ADMIN_ROLE_KEY)),
  });

  if (!role) {
    console.warn(
      `  ⚠ Role key="${ADMIN_ROLE_KEY}" not found on client "${clientKey}", skipping.`,
    );
    return;
  }

  await db
    .insert(schema.userRolesTable)
    .values({ userId, clientId: client.id, roleId: role.id })
    .onConflictDoNothing({
      target: [
        schema.userRolesTable.userId,
        schema.userRolesTable.clientId,
        schema.userRolesTable.roleId,
      ],
    });

  console.log(`  ✓ Granted "${ADMIN_ROLE_KEY}" on "${clientKey}"`);
}

async function main() {
  const user = await db.query.usersTable.findFirst({
    where: (t, { eq }) => eq(t.email, ADMIN_EMAIL),
  });

  if (!user) throw new Error(`User not found: ${ADMIN_EMAIL}`);

  console.log(`Granting admin to ${user.email} (${user.id})`);

  if (CLIENT_KEY === "all") {
    // Grant admin on every first-party client
    const clients = await db.query.clientsTable.findMany({
      where: (t, { eq }) => eq(t.firstParty, true),
    });
    console.log(`Targeting all ${clients.length} first-party clients...`);
    for (const c of clients) {
      await grantOnClient(user.id, user.email, c.key);
    }
  } else {
    await grantOnClient(user.id, user.email, CLIENT_KEY);
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
