import { commentTargetTypeValues } from "@site-haus/validation/core/enums";
import { z } from "zod";

export const commentTargetTypeEnum = z.enum(commentTargetTypeValues);

export const createCommentSchema = z.object({
  targetType: commentTargetTypeEnum,
  targetId: z.uuid(),
  body: z.string().min(1, "Comment cannot be empty"),
  isInternal: z.boolean().optional(),
  parentId: z.uuid().optional(),
});

export const updateCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty"),
});

export const listCommentsQuerySchema = z.object({
  targetType: commentTargetTypeEnum,
  targetId: z.uuid(),
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  cursor: z.uuid().optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type ListCommentsQuery = z.infer<typeof listCommentsQuerySchema>;
