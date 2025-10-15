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

export const acceptInviteSchema = z.object({
  clientId: z.uuid(),
  email: z.email(),
  code: z.string().min(6),
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});
