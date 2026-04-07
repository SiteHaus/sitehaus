import { z } from "zod";
import { codeSchema, emailSchema, nameSchema } from "../core/zod-helpers.js";

/**
 * Update profile (first name, last name)
 */
export const updateProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
});

/**
 * Request email change - requires password confirmation
 * Sends OTP to the new email address for verification
 */
export const changeEmailRequestSchema = z.object({
  newEmail: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * Confirm email change with OTP sent to new email
 */
export const changeEmailConfirmSchema = z.object({
  code: codeSchema,
});

/**
 * Enable 2FA - verify TOTP code from authenticator app
 * Secret is passed from the setup step (not stored server-side until verified)
 */
export const enable2faSchema = z.object({
  code: codeSchema,
  secret: z.string().min(1, "Secret is required"),
});

/**
 * Disable 2FA - requires password confirmation
 */
export const disable2faSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

/**
 * Delete account - requires password and typing DELETE to confirm
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmation: z.string().refine((val) => val === "DELETE", {
    message: 'Type "DELETE" to confirm',
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangeEmailRequestInput = z.infer<typeof changeEmailRequestSchema>;
export type ChangeEmailConfirmInput = z.infer<typeof changeEmailConfirmSchema>;
export type Enable2faInput = z.infer<typeof enable2faSchema>;
export type Disable2faInput = z.infer<typeof disable2faSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
