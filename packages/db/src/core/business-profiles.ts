import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { clientsTable } from "../iam/clients.js";

export const businessProfilesTable = pgTable(
  "business_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clientsTable.id, { onDelete: "cascade" }),
    businessName: text("business_name").notNull(),
    industry: text("industry"),
    description: text("description"),
    targetAudience: text("target_audience"),
    currentPresence: jsonb("current_presence"),
    goals: text("goals"),
    painPoints: text("pain_points"),
    brandColors: jsonb("brand_colors"),
    brandFonts: text("brand_fonts"),
    hasLogo: boolean("has_logo").default(false).notNull(),
    inspirationUrls: jsonb("inspiration_urls"),
    competitors: text("competitors"),
    additionalNotes: text("additional_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [uniqueIndex("business_profiles_client_uq").on(t.clientId)],
);

export type BusinessProfile = typeof businessProfilesTable.$inferSelect;
export type NewBusinessProfile = typeof businessProfilesTable.$inferInsert;
