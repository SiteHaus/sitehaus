import {
  changeEmailConfirmSchema,
  changeEmailRequestSchema,
  deleteAccountSchema,
  disable2faSchema,
  enable2faSchema,
  updateProfileSchema,
} from "@site-haus/validation/forms/account";
import {
  loginSchema,
  registerSchema,
  requestVerifySchema,
  verify2faLoginSchema,
  verifySchema,
} from "@site-haus/validation/forms/auth";
import { acceptInviteSchema } from "@site-haus/validation/forms/invite";
import { resetPasswordSchema } from "@site-haus/validation/forms/password";
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

export const loginResponse = authTokens.extend({
  requiresEmailVerification: z.boolean().optional(),
  requires2FA: z.boolean().optional(),
});

export const otpLoginResponse = authTokens.extend({
  isOtpLogin: z.boolean().default(true),
  requiresEmailVerification: z.boolean().default(false),
});

// Token introspection response
export const introspectResponse = z.object({
  active: z.boolean(),
  user: userBrief.optional(),
  session: sessionBrief.optional(),
  permissions: z.array(z.string()).optional(),
  exp: z.number().optional(),
});

// Token introspection for client SDKs (validates tokens without database access)
export const introspectRouter = c.router({
  introspect: {
    method: "POST",
    path: "/auth/introspect",
    body: c.noBody(),
    responses: {
      200: introspectResponse,
    },
  },
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
      200: loginResponse,
      400: apiErrorValidation,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  loginWithCode: {
    method: "POST",
    path: "/auth/login-with-reset-code",
    body: resetPasswordSchema.pick({ email: true, code: true }),
    responses: {
      200: otpLoginResponse,
      400: apiErrorHttp,
      409: apiErrorHttp,
      429: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  verify2faLogin: {
    method: "POST",
    path: "/auth/2fa/verify-login",
    body: verify2faLoginSchema,
    responses: {
      200: authTokens,
      400: apiErrorHttp,
      401: apiErrorHttp,
      403: apiErrorHttp,
      429: apiErrorHttp,
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

// OAuth2 Authorization Code Flow with PKCE
export const oauthRouter = c.router({
  authorize: {
    method: "GET",
    path: "/auth/authorize",
    query: z.object({
      client_id: z.uuid(),
      redirect_uri: z.url(),
      response_type: z.literal("code"),
      code_challenge: z.string().min(43).max(128),
      code_challenge_method: z.literal("S256"),
      state: z.string().optional(),
      scope: z.string().optional(),
    }),
    responses: {
      302: z.void(), // Redirect response
      400: z.object({
        error: z.string(),
        error_description: z.string().optional(),
      }),
    },
  },
  token: {
    method: "POST",
    path: "/auth/token",
    contentType: "application/x-www-form-urlencoded",
    body: z.object({
      grant_type: z.literal("authorization_code"),
      code: z.string(),
      redirect_uri: z.url(),
      code_verifier: z.string().min(43).max(128),
      client_id: z.uuid(),
    }),
    responses: {
      200: z.object({
        access_token: z.string(),
        token_type: z.literal("Bearer"),
        expires_in: z.number(),
        scope: z.string(),
        refresh_token: z.string().optional(),
        id_token: z.string().optional(),
        requires_2fa: z.boolean().optional(),
      }),
      400: z.object({
        error: z.enum([
          "invalid_request",
          "invalid_grant",
          "unsupported_grant_type",
          "invalid_client",
        ]),
        error_description: z.string().optional(),
      }),
    },
  },
  consent: {
    method: "POST",
    path: "/auth/consent",
    body: z.object({
      client_id: z.uuid(),
      redirect_uri: z.url(),
      scope: z.string(),
      state: z.string().optional(),
      code_challenge: z.string().min(43).max(128),
      code_challenge_method: z.literal("S256"),
      approved: z.boolean(),
    }),
    responses: {
      200: z.object({
        redirect_url: z.url(),
      }),
      400: z.object({
        error: z.string(),
        error_description: z.string().optional(),
      }),
    },
  },
});

// Account management (requires authentication)
export const accountRouter = c.router({
  // Update profile (first name, last name)
  updateProfile: {
    method: "PATCH",
    path: "/auth/profile",
    body: updateProfileSchema,
    responses: {
      200: userBrief,
      401: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  // Request email change (sends OTP to new email)
  requestEmailChange: {
    method: "POST",
    path: "/auth/email/request",
    body: changeEmailRequestSchema,
    responses: {
      204: z.void(),
      400: apiErrorValidation,
      401: apiErrorHttp,
      409: apiErrorHttp, // Email already in use
      500: apiErrorServer,
    },
  },
  // Confirm email change with OTP
  confirmEmailChange: {
    method: "POST",
    path: "/auth/email/confirm",
    body: changeEmailConfirmSchema,
    responses: {
      200: userBrief,
      400: apiErrorHttp, // Invalid or expired code
      401: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  // Delete account
  deleteAccount: {
    method: "DELETE",
    path: "/auth/account",
    body: deleteAccountSchema,
    responses: {
      204: z.void(),
      401: apiErrorHttp, // Wrong password
      500: apiErrorServer,
    },
  },
  // 2FA: Setup (generate TOTP secret and QR code)
  setup2fa: {
    method: "POST",
    path: "/auth/2fa/setup",
    body: c.noBody(),
    responses: {
      200: z.object({
        secret: z.string(),
        qrCodeDataUrl: z.string(),
        otpauthUrl: z.string(),
      }),
      401: apiErrorHttp,
      409: apiErrorHttp, // Already enabled
      500: apiErrorServer,
    },
  },
  // 2FA: Enable (verify TOTP code and activate)
  enable2fa: {
    method: "POST",
    path: "/auth/2fa/enable",
    body: enable2faSchema,
    responses: {
      200: z.object({
        enabled: z.boolean(),
        backupCodes: z.array(z.string()),
      }),
      400: apiErrorHttp, // Invalid code
      401: apiErrorHttp,
      409: apiErrorHttp, // Already enabled
      500: apiErrorServer,
    },
  },
  // 2FA: Disable
  disable2fa: {
    method: "POST",
    path: "/auth/2fa/disable",
    body: disable2faSchema,
    responses: {
      204: z.void(),
      401: apiErrorHttp, // Wrong password
      409: apiErrorHttp, // Not enabled
      500: apiErrorServer,
    },
  },
  // 2FA: Get status
  get2faStatus: {
    method: "GET",
    path: "/auth/2fa/status",
    responses: {
      200: z.object({
        enabled: z.boolean(),
        enabledAt: dateTime.nullable(),
      }),
      401: apiErrorHttp,
      500: apiErrorServer,
    },
  },
});

export const authContract = c.router({
  public: authPublicRouter,
  loginOnly: authLoginRouter,
  private: authPrivateRouter,
  oauth: oauthRouter,
  account: accountRouter,
  introspect: introspectRouter,
});

export type MeUser = z.infer<typeof userBrief>;
export type MeSession = z.infer<typeof sessionBrief>;
