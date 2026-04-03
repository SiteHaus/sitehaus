import { schema } from "@site-haus/db";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and } from "drizzle-orm";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

async function fixIamRedirects() {
  await db.transaction(async (tx) => {
    // Find the IAM client
    const iamClient = await tx.query.clientsTable.findFirst({
      where: eq(schema.clientsTable.key, "iam"),
    });

    if (!iamClient) {
      console.log("IAM client not found. Run seed first.");
      return;
    }

    console.log(`Found IAM client: ${iamClient.id}`);

    // Delete old redirect URIs (port 3000)
    const oldUri = "http://localhost:3000/callback";
    await tx
      .delete(schema.clientRedirectUrisTable)
      .where(
        and(
          eq(schema.clientRedirectUrisTable.clientId, iamClient.id),
          eq(schema.clientRedirectUrisTable.uri, oldUri),
        ),
      );

    console.log(`Deleted old redirect URI: ${oldUri}`);

    // Insert correct redirect URI (port 3002)
    const newUri = "http://localhost:3002/callback";
    await tx
      .insert(schema.clientRedirectUrisTable)
      .values({
        clientId: iamClient.id,
        uri: newUri,
      })
      .onConflictDoNothing();

    console.log(`Added new redirect URI: ${newUri}`);
  });

  console.log("IAM redirect URIs fixed successfully!");
}

fixIamRedirects()
  .catch(async (e) => {
    console.error(e);
    await pool.end();
    process.exit(1);
  })
  .finally(() => pool.end());
