import { assetReviewStatusValues } from "@site-haus/validation/core/enums";
import { z } from "zod";

export const assetReviewStatusEnum = z.enum(assetReviewStatusValues);

export const updateAssetSchema = z
  .object({
    notes: z.string().nullable().optional(),
    reviewStatus: assetReviewStatusEnum.optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No changes provided",
  });

export const listAssetsQuerySchema = z.object({
  fileType: z.string().optional(),
  reviewStatus: assetReviewStatusEnum.optional(),
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  cursor: z.uuid().optional(),
});

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type ListAssetsQuery = z.infer<typeof listAssetsQuerySchema>;
