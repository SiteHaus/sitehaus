import { z } from "zod";

export const emailSchema = z
  .email({ message: "Enter a valid email" })
  .toLowerCase()
  .max(256, "Email is too long");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(120, "Too long");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Too long")
  .regex(/[A-Za-z]/, "Must include a letter")
  .regex(/\d/, "Must include a number");

export const codeSchema = z.string().regex(/^\d{6}$/, "Code must be 6 digits");
