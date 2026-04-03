import {
  createBusinessProfileSchema,
  updateBusinessProfileSchema,
} from "@site-haus/validation/forms/business-profile";
import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { apiErrorHttp, apiErrorServer, apiErrorValidation, dateTime } from "./primitives.js";

const c = initContract();

export const businessProfileItem = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  businessName: z.string(),
  industry: z.string().nullable(),
  description: z.string().nullable(),
  targetAudience: z.string().nullable(),
  currentPresence: z.unknown().nullable(),
  goals: z.string().nullable(),
  painPoints: z.string().nullable(),
  brandColors: z.unknown().nullable(),
  brandFonts: z.string().nullable(),
  hasLogo: z.boolean(),
  inspirationUrls: z.unknown().nullable(),
  competitors: z.string().nullable(),
  additionalNotes: z.string().nullable(),
  createdAt: dateTime.nullable(),
  updatedAt: dateTime.nullable(),
});

export const businessProfilesRouter = c.router({
  getMe: {
    method: "GET",
    path: "/business-profiles/me",
    responses: {
      200: z.object({ profile: businessProfileItem }),
      401: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  getByClient: {
    method: "GET",
    path: "/business-profiles/:clientId",
    pathParams: c.type<{ clientId: string }>(),
    responses: {
      200: z.object({ profile: businessProfileItem }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  create: {
    method: "POST",
    path: "/business-profiles",
    body: createBusinessProfileSchema,
    responses: {
      201: z.object({ profile: businessProfileItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  updateMe: {
    method: "PATCH",
    path: "/business-profiles/me",
    body: updateBusinessProfileSchema,
    responses: {
      200: z.object({ profile: businessProfileItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
});

export type BusinessProfileItem = z.infer<typeof businessProfileItem>;
