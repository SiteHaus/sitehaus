import { z } from "zod";
import { codeSchema, passwordSchema } from "../core/zod-helpers.js";

const normalizeEmail = (s: string) => s.trim().toLowerCase();

export const requestPasswordResetSchema = z.object({
  email: z.email().transform(normalizeEmail),
});

export const resetPasswordSchema = z.object({
  email: z.email().transform(normalizeEmail),
  code: codeSchema,
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});


export type RequestInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetInput = z.infer<typeof resetPasswordSchema>;