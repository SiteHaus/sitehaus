import {
  loginSchema,
  registerSchema,
  requestVerifySchema,
  verifySchema,
} from "@site-haus/validation/forms/auth";
import { acceptInviteSchema } from "@site-haus/validation/forms/invite";
import { initContract } from "@ts-rest/core";
import * as z from "zod";
import {
  apiErrorHttp,
  apiErrorServer,
  apiErrorValidation,
  dateTime,
  sessionBrief,
  userBrief,
} from "./primitives.js";

type RegisterBody = z.infer<typeof registerSchema>;
type RegisterResponse = z.infer<typeof registerResponse>;

const c = initContract();

export const authTokens = z.object({
  accessToken: z.string(),
  accessTokenExpiresIn: z.number(),
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

// No session required
export const authPublicRouter = c.router({
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
  acceptInvite: {
    method: "POST",
    path: "/auth/accept-invite",
    body: acceptInviteSchema,
    responses: {
      200: authTokens,
      400: apiErrorValidation,
      401: apiErrorHttp,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
});

export const authLoginRouter = c.router({
  login: {
    method: "POST",
    path: "/auth/login",
    body: loginSchema,
    responses: {
      200: registerResponse,
      400: apiErrorValidation,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
});

export const authPrivateRouter = c.router({
  me: {
    method: "GET",
    path: "/auth/me",
    responses: { 200: meResponse, 401: apiErrorHttp },
  },
  logout: {
    method: "POST",
    path: "/auth/logout",
    body: c.noBody(),
    responses: { 204: z.void() },
  },
});

export const authContract = c.router({
  public: authPublicRouter,
  loginOnly: authLoginRouter,
  private: authPrivateRouter,
});

export type MeUser = z.infer<typeof userBrief>;
export type MeSession = z.infer<typeof sessionBrief>;
