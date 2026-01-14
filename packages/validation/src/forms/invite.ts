import z from "zod";
import { nameSchema, passwordSchema } from "../core/zod-helpers.js";

export const createInviteSchema = z.object({
  email: z.email(),
  roleIds: z.array(z.uuid()).optional(),
  ttlMinutes: z
    .number()
    .int()
    .min(5)
    .max(60 * 24 * 30)
    .optional(),
});

// Base schema for invite acceptance (shared fields)
const acceptInviteBaseSchema = z.object({
  clientId: z.uuid(),
  email: z.email(),
  code: z.string().min(6),
});

// Schema for new users - requires password and name
export const acceptInviteNewUserSchema = acceptInviteBaseSchema.extend({
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

// Schema for existing users - no additional fields needed
export const acceptInviteExistingUserSchema = acceptInviteBaseSchema;

// Combined schema for API validation (makes fields optional for existing users)
export const acceptInviteSchema = acceptInviteBaseSchema.extend({
  password: passwordSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
});

export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type AcceptInviteNewUserInput = z.infer<typeof acceptInviteNewUserSchema>;
export type AcceptInviteExistingUserInput = z.infer<typeof acceptInviteExistingUserSchema>;
