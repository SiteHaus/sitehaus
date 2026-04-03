import z from "zod";
import { clientTypeValues } from "../core/enums.js";

/**
 * Schema for updating a client's settings
 * Note: key, type, audience, firstParty, hidden are immutable after creation
 */
export const updateClientSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    allowedScopes: z.string().max(500).optional(),
    requiresConsent: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No changes provided",
  });

export type UpdateClientInput = z.infer<typeof updateClientSchema>;

/**
 * Schema for adding a redirect URI
 */
export const addRedirectUriSchema = z.object({
  uri: z
    .string()
    .min(1)
    .max(512)
    .refine(
      (uri) => {
        try {
          new URL(uri);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Invalid URL format" },
    ),
});

export type AddRedirectUriInput = z.infer<typeof addRedirectUriSchema>;

/**
 * Schema for creating a new client (SiteHaus admin only)
 * This is for future use when we add client creation
 */
export const createClientSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_-]+$/i, "Key must be alphanumeric with dashes/underscores"),
  name: z.string().min(2).max(120),
  type: z.enum(clientTypeValues).default("public"),
  audience: z.string().min(2).max(128),
  allowedScopes: z.string().max(500).optional(),
  requiresConsent: z.boolean().optional().default(true),
  firstParty: z.boolean().optional().default(false),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
