import { assetReviewStatusValues } from "@site-haus/validation/core/enums";
import {
  listAssetsQuerySchema,
  updateAssetSchema,
} from "@site-haus/validation/forms/asset";
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

export const assetItem = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  fileName: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
  storageKey: z.string(),
  uploadedBy: z.uuid(),
  reviewStatus: z.enum(assetReviewStatusValues),
  notes: z.string().nullable(),
  createdAt: dateTime.nullable(),
});

export const assetDetail = assetItem.extend({
  uploader: userBrief.nullable(),
  downloadUrl: z.string(),
});

export const assetListResponse = z.object({
  assets: z.array(assetItem),
  nextCursor: z.uuid().optional(),
});

export const assetsRouter = c.router({
  list: {
    method: "GET",
    path: "/projects/:projectId/assets",
    pathParams: c.type<{ projectId: string }>(),
    query: listAssetsQuerySchema,
    responses: {
      200: assetListResponse,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  get: {
    method: "GET",
    path: "/projects/:projectId/assets/:assetId",
    pathParams: c.type<{ projectId: string; assetId: string }>(),
    responses: {
      200: z.object({ asset: assetDetail }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  upload: {
    method: "POST",
    path: "/projects/:projectId/assets/upload",
    pathParams: c.type<{ projectId: string }>(),
    contentType: "multipart/form-data",
    body: c.type<{ file: File; notes?: string }>(),
    responses: {
      201: z.object({ asset: assetItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  update: {
    method: "PATCH",
    path: "/projects/:projectId/assets/:assetId",
    pathParams: c.type<{ projectId: string; assetId: string }>(),
    body: updateAssetSchema,
    responses: {
      200: z.object({ asset: assetItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  remove: {
    method: "DELETE",
    path: "/projects/:projectId/assets/:assetId",
    pathParams: c.type<{ projectId: string; assetId: string }>(),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
});

export type AssetItem = z.infer<typeof assetItem>;
export type AssetDetail = z.infer<typeof assetDetail>;
export type AssetListResponse = z.infer<typeof assetListResponse>;
