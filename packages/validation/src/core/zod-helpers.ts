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
