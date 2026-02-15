import { clientTypeValues } from "@site-haus/validation/core/enums";
import {
  createClientSchema,
  updateClientSchema,
  addRedirectUriSchema,
} from "@site-haus/validation/forms/client";
import { initContract } from "@ts-rest/core";
import z from "zod";
import { apiErrorHttp, apiErrorValidation, userBrief } from "./primitives.js";

const c = initContract();

export const clientMember = userBrief.extend({
  roles: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
    })
  ),
});

export type ClientMember = z.infer<typeof clientMember>;

export const meClient = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
  type: z.enum(clientTypeValues),
  firstParty: z.boolean(),
  canManage: z.boolean(),
  hidden: z.boolean().optional(),
});

export type MeClient = z.infer<typeof meClient>;

/** Full client details for the settings page */
export const clientDetail = z.object({
  id: z.uuid(),
  key: z.string(),
  name: z.string(),
  type: z.enum(clientTypeValues),
  firstParty: z.boolean(),
  audience: z.string(),
  allowedScopes: z.string().nullable(),
  requiresConsent: z.boolean(),
  hidden: z.boolean(),
  createdAt: z.string().nullable(),
});

export type ClientDetail = z.infer<typeof clientDetail>;

/** Redirect URI */
export const redirectUri = z.object({
  id: z.uuid(),
  uri: z.string(),
});

export type RedirectUri = z.infer<typeof redirectUri>;

export const clientsRouter = c.router({
  create: {
    method: "POST",
    path: "/clients",
    body: createClientSchema,
    responses: {
      201: c.type<{ client: MeClient }>(),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      409: c.type<{ message: string }>(),
    },
  },
  meMembers: {
    method: "GET",
    path: "/clients/me/members",
    responses: {
      200: c.type<{ members: ClientMember[] }>(),
    },
  },
  meClients: {
    method: "GET",
    path: "/clients/me/clients",
    responses: {
      200: c.type<{ clients: MeClient[] }>(),
    },
  },

  // Current client management (uses x-client-id header)
  getCurrent: {
    method: "GET",
    path: "/clients/current",
    responses: {
      200: c.type<{ client: ClientDetail }>(),
      400: c.type<{ message: string }>(),
    },
  },
  updateCurrent: {
    method: "PATCH",
    path: "/clients/current",
    body: updateClientSchema,
    responses: {
      200: c.type<{ client: ClientDetail }>(),
      400: c.type<{ message: string }>(),
    },
  },

  // Redirect URI management
  listRedirectUris: {
    method: "GET",
    path: "/clients/current/redirect-uris",
    responses: {
      200: c.type<{ redirectUris: RedirectUri[] }>(),
      400: c.type<{ message: string }>(),
    },
  },
  addRedirectUri: {
    method: "POST",
    path: "/clients/current/redirect-uris",
    body: addRedirectUriSchema,
    responses: {
      201: c.type<{ redirectUri: RedirectUri }>(),
      400: c.type<{ message: string }>(),
      409: c.type<{ message: string }>(),
    },
  },
  removeRedirectUri: {
    method: "DELETE",
    path: "/clients/current/redirect-uris/:uriId",
    pathParams: z.object({ uriId: z.string().uuid() }),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      400: c.type<{ message: string }>(),
      404: c.type<{ message: string }>(),
    },
  },
});

export type ClientsRouter = typeof clientsRouter;
