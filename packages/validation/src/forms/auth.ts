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
  password: z.string().min(1, "Password is required"),
});

export const requestVerifySchema = z.object({
  email: emailSchema,
});

export const verifySchema = z.object({
  email: emailSchema,
  code: codeSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
