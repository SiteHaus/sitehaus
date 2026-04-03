import { z } from "zod";

export const emailSchema = z
  .email({ message: "Enter a valid email" })
  .toLowerCase()
  .max(256, "Email is too long");

export const nameSchema = z.string().trim().min(1, "Required").max(120, "Too long");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number")
  .regex(/[@$!%*?&#^()_+\-=\[\]{}|;:'",.<>\/\\]/, "Password must include a special character");

export const codeSchema = z.string().regex(/^\d{6}$/, "Code must be 6 digits");
