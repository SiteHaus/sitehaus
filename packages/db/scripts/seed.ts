import { schema } from "@site-haus/db";
import { clientsTable, NewClient } from "@site-haus/db/iam/clients";
import { rolesTable } from "@site-haus/db/iam/roles";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

const main = async () => {
  const clients: NewClient[] = [
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

  await db
    .insert(clientsTable)
    .values(clients)
    .onConflictDoNothing({ target: clientsTable.key });

  const all = await db.select().from(clientsTable);
  for (const c of all) {
    await db
      .insert(rolesTable)
      .values([
        { clientId: c.id, key: "admin", name: "Admin", isDefault: false },
        { clientId: c.id, key: "member", name: "Member", isDefault: true },
      ])
      .onConflictDoNothing({ target: [rolesTable.clientId, rolesTable.key] });
  }
};

main()
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  })
  .finally(() => pool.end());
