import {
  changePasswordSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "@site-haus/validation/forms/password";
import { initContract } from "@ts-rest/core";
import z from "zod";
import { apiErrorHttp, apiErrorServer } from "./primitives.js";

const c = initContract();

export const passwordRouter = c.router({
  change: {
    method: "POST",
    path: "/password/change",
    body: changePasswordSchema,
    responses: { 204: z.void(), 401: apiErrorHttp, 500: apiErrorServer },
  },
  requestReset: {
    method: "POST",
    path: "/password/request-password-reset",
    body: requestPasswordResetSchema,
    responses: { 204: z.void() },
  },
  reset: {
    method: "POST",
    path: "/password/reset",
    body: resetPasswordSchema,
    responses: {
      204: z.void(),
      400: apiErrorHttp,
      401: apiErrorHttp,
      409: apiErrorHttp,
      429: apiErrorHttp,
    },
  },
});

export type PasswordRouter = typeof passwordRouter;
