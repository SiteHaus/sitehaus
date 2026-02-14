import { designDocumentStatusValues } from "@site-haus/validation/core/enums";
import { z } from "zod";

export const designDocumentStatusEnum = z.enum(designDocumentStatusValues);

export const createDesignDocumentSchema = z.object({
  content: z.string().optional(),
});

export const updateDesignDocumentSchema = z.object({
  content: z.string(),
});

export const publishDesignDocumentSchema = z.object({
  changeNote: z.string().optional(),
});

export const designDocStatusTransitionSchema = z.object({
  status: designDocumentStatusEnum,
});

export type CreateDesignDocumentInput = z.infer<
  typeof createDesignDocumentSchema
>;
export type UpdateDesignDocumentInput = z.infer<
  typeof updateDesignDocumentSchema
>;
export type PublishDesignDocumentInput = z.infer<
  typeof publishDesignDocumentSchema
>;
export type DesignDocStatusTransition = z.infer<
  typeof designDocStatusTransitionSchema
>;
