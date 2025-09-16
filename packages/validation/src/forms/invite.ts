import z from "zod";
import { nameSchema, passwordSchema } from "../core/zod-helpers.js";

export const createInviteSchema = z.object({
  email: z.email(),
  roleIds: z.array(z.uuid()).optional(),
});

export const acceptInviteSchema = z.object({
  email: z.email(),
  code: z.string().min(4),
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});
