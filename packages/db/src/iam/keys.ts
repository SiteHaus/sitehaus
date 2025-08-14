import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const jwtKeys = pgTable("jwt_key", {
  kid: text("kid").primaryKey(),
  publicJwk: jsonb("public_jwk").notNull(),
  privateJwkEncrypted: text("private_jwk_encrypted").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
});

export type JwtKeys = typeof jwtKeys.$inferSelect;
export type NewJwtKeys = typeof jwtKeys.$inferInsert;
