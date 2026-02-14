import { designDocumentStatusValues } from "@site-haus/validation/core/enums";
import {
  createDesignDocumentSchema,
  designDocStatusTransitionSchema,
  publishDesignDocumentSchema,
  updateDesignDocumentSchema,
} from "@site-haus/validation/forms/design-document";
import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  apiErrorHttp,
  apiErrorServer,
  apiErrorValidation,
  dateTime,
  userBrief,
} from "./primitives.js";

const c = initContract();

export const designDocumentItem = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  content: z.string().nullable(),
  status: z.enum(designDocumentStatusValues),
  currentVersion: z.number(),
  approvedAt: dateTime.nullable(),
  approvedBy: userBrief.nullable(),
  createdBy: userBrief.nullable(),
  createdAt: dateTime.nullable(),
  updatedAt: dateTime.nullable(),
});

export const designDocumentVersionItem = z.object({
  id: z.uuid(),
  designDocumentId: z.uuid(),
  version: z.number(),
  content: z.string(),
  changeNote: z.string().nullable(),
  createdBy: userBrief.nullable(),
  createdAt: dateTime.nullable(),
});

export const designDocumentsRouter = c.router({
  get: {
    method: "GET",
    path: "/projects/:projectId/design-document",
    pathParams: c.type<{ projectId: string }>(),
    responses: {
      200: z.object({ document: designDocumentItem }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  create: {
    method: "POST",
    path: "/projects/:projectId/design-document",
    pathParams: c.type<{ projectId: string }>(),
    body: createDesignDocumentSchema,
    responses: {
      201: z.object({ document: designDocumentItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      409: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  update: {
    method: "PATCH",
    path: "/projects/:projectId/design-document",
    pathParams: c.type<{ projectId: string }>(),
    body: updateDesignDocumentSchema,
    responses: {
      200: z.object({ document: designDocumentItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  publish: {
    method: "POST",
    path: "/projects/:projectId/design-document/publish",
    pathParams: c.type<{ projectId: string }>(),
    body: publishDesignDocumentSchema,
    responses: {
      200: z.object({ document: designDocumentItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  transitionStatus: {
    method: "PATCH",
    path: "/projects/:projectId/design-document/status",
    pathParams: c.type<{ projectId: string }>(),
    body: designDocStatusTransitionSchema,
    responses: {
      200: z.object({ document: designDocumentItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  listVersions: {
    method: "GET",
    path: "/projects/:projectId/design-document/versions",
    pathParams: c.type<{ projectId: string }>(),
    responses: {
      200: z.object({
        versions: z.array(designDocumentVersionItem),
      }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  getVersion: {
    method: "GET",
    path: "/projects/:projectId/design-document/versions/:version",
    pathParams: c.type<{ projectId: string; version: string }>(),
    responses: {
      200: z.object({ version: designDocumentVersionItem }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
});

export type DesignDocumentItem = z.infer<typeof designDocumentItem>;
export type DesignDocumentVersionItem = z.infer<
  typeof designDocumentVersionItem
>;
