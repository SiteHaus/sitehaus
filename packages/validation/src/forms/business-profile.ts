import { z } from "zod";

const currentPresenceSchema = z.object({
  website: z.string().optional(),
  social: z
    .object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      tiktok: z.string().optional(),
      youtube: z.string().optional(),
    })
    .optional(),
});

export const createBusinessProfileSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  industry: z.string().optional(),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  currentPresence: currentPresenceSchema.optional(),
  goals: z.string().optional(),
  painPoints: z.string().optional(),
  brandColors: z.array(z.string()).optional(),
  brandFonts: z.string().optional(),
  hasLogo: z.boolean().optional(),
  inspirationUrls: z.array(z.string()).optional(),
  competitors: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export const updateBusinessProfileSchema = z
  .object({
    businessName: z.string().min(1).optional(),
    industry: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    targetAudience: z.string().nullable().optional(),
    currentPresence: currentPresenceSchema.nullable().optional(),
    goals: z.string().nullable().optional(),
    painPoints: z.string().nullable().optional(),
    brandColors: z.array(z.string()).nullable().optional(),
    brandFonts: z.string().nullable().optional(),
    hasLogo: z.boolean().optional(),
    inspirationUrls: z.array(z.string()).nullable().optional(),
    competitors: z.string().nullable().optional(),
    additionalNotes: z.string().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No changes provided",
  });

export type CreateBusinessProfileInput = z.infer<typeof createBusinessProfileSchema>;
export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
