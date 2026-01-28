import { schema } from "@site-haus/db";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

const ADMIN_EMAIL = process.env.SITEHAUS_ADMIN_EMAIL ?? "you@sitehaus.dev";
const CLIENT_KEY = process.env.SITEHAUS_ADMIN_CLIENT_KEY ?? "dashboard"; // or "dashboard"
const ADMIN_ROLE_KEY = process.env.SITEHAUS_ADMIN_ROLE_KEY ?? "admin";

async function main() {
  console.log("Granting admin:", { ADMIN_EMAIL, CLIENT_KEY, ADMIN_ROLE_KEY });

  const client = await db.query.clientsTable.findFirst({
    where: (t, { eq }) => eq(t.key, CLIENT_KEY),
  });

  if (!client) {
    throw new Error(`Client with key=${CLIENT_KEY} not found`);
  }

  const user = await db.query.usersTable.findFirst({
    where: (t, { eq }) => eq(t.email, ADMIN_EMAIL),
  });

  if (!user) {
    throw new Error(`User with email=${ADMIN_EMAIL} not found`);
  }

  const role = await db.query.rolesTable.findFirst({
    where: (t, { and, eq }) =>
      and(eq(t.clientId, client.id), eq(t.key, ADMIN_ROLE_KEY)),
  });

  if (!role) {
    throw new Error(
      `Role with key=${ADMIN_ROLE_KEY} not found for client ${CLIENT_KEY}`,
    );
  }

  console.log(
    `Assigning role '${role.key}' to user ${user.email} on client ${client.key}`,
  );

  await db
    .insert(schema.userRolesTable)
    .values({
      userId: user.id,
      clientId: client.id,
      roleId: role.id,
    })
    .onConflictDoNothing({
      target: [
        schema.userRolesTable.userId,
        schema.userRolesTable.clientId,
        schema.userRolesTable.roleId,
      ],
    });

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
