import { z } from "zod";
import { emailSchema, nameSchema } from "../core/zod-helpers.js";

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Too long")
  .regex(/[A-Za-z]/, "Must include a letter")
  .regex(/\d/, "Must include a number");

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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
