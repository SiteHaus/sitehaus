import { userStatusValues } from "@site-haus/validation/core/enums";
import { ALL_PERMISSIONS } from "@site-haus/validation/core/perms";
import { z } from "zod";

export const dateTime = z.iso.datetime();
export const permission = z.enum(ALL_PERMISSIONS);

export const userBrief = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  isVerified: z.boolean(),
  status: z.enum(userStatusValues),
});

export const sessionBrief = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
});

export const apiErrorValidation = z.object({
  error: z.object({
    type: z.literal("validation_error"),
    message: z.string(),
    details: z.array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      })
    ),
  }),
});

export const apiErrorHttp = z
  .object({
    error: z.object({ type: z.literal("http_error") }),
    message: z.string(),
  })
  .loose();

export const apiErrorServer = z.object({
  error: z.object({ type: z.literal("server_error"), message: z.string() }),
});
