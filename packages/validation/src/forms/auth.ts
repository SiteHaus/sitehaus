import { z } from "zod";
import {
  codeSchema,
  emailSchema,
  nameSchema,
  passwordSchema,
} from "../core/zod-helpers.js";

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const requestVerifySchema = z.object({
  email: emailSchema,
});

export const verifySchema = z.object({
  email: emailSchema,
  code: codeSchema,
});

// 2FA login verification accepts either 6-digit TOTP code or 12-char backup code
export const verify2faLoginSchema = z.object({
  code: z
    .string()
    .min(6, "Code must be at least 6 characters")
    .max(12, "Code must be at most 12 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyInput = z.infer<typeof verifySchema>;
export type Verify2faLoginInput = z.infer<typeof verify2faLoginSchema>;
