import {
  registerSchema,
  requestVerifySchema,
  verifySchema,
} from "@site-haus/validation/forms/auth";
import { initContract } from "@ts-rest/core";
import * as z from "zod";
import {
  apiErrorHttp,
  apiErrorServer,
  apiErrorValidation,
  dateTime,
  sessionBrief,
  userBrief,
} from "./primatives.js";

type RegisterBody = z.infer<typeof registerSchema>;
type RegisterResponse = z.infer<typeof registerResponse>;

const c = initContract();

export const authTokens = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number(),
  refreshToken: z.string(),
  refreshTokenExpiresAt: dateTime,
  sessionId: z.uuid(),
  userId: z.uuid(),
});

export const meResponse = z.object({
  user: userBrief.nullable(),
  session: sessionBrief,
  permissions: z.array(z.string()),
});

export const registerResponse = authTokens.extend({
  requiresEmailVerification: z.boolean(),
});

export const authRouter = c.router({
  register: {
    method: "POST",
    path: "/auth/register",
    body: registerSchema,
    responses: {
      200: registerResponse,
      400: apiErrorValidation,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  login: {
    method: "POST",
    path: "/auth/login",
    body: registerSchema,
    responses: {
      200: registerResponse,
      400: apiErrorValidation,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  refresh: {
    method: "POST",
    path: "/auth/refresh",
    body: c.type<RegisterBody>(),
    responses: {
      200: authTokens,
      400: apiErrorHttp,
      401: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  me: {
    method: "GET",
    path: "/auth/me",
    responses: { 200: meResponse, 401: apiErrorHttp },
  },
  requestEmailVerification: {
    method: "POST",
    path: "/auth/request-email-verification",
    body: requestVerifySchema,
    responses: { 204: c.type<RegisterResponse>() },
  },
  verifyEmail: {
    method: "POST",
    path: "/auth/verify-email",
    body: verifySchema,
    responses: { 204: c.type<RegisterResponse>(), 400: apiErrorHttp },
  },
});
