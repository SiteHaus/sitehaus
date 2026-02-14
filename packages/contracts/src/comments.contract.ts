import { commentTargetTypeValues } from "@site-haus/validation/core/enums";
import {
  createCommentSchema,
  listCommentsQuerySchema,
  updateCommentSchema,
} from "@site-haus/validation/forms/comment";
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

export const commentItem = z.object({
  id: z.uuid(),
  targetType: z.enum(commentTargetTypeValues),
  targetId: z.uuid(),
  authorId: z.uuid(),
  body: z.string(),
  isInternal: z.boolean(),
  parentId: z.uuid().nullable(),
  createdAt: dateTime.nullable(),
  updatedAt: dateTime.nullable(),
});

export const commentDetail = commentItem.extend({
  author: userBrief.nullable(),
});

export const commentListResponse = z.object({
  comments: z.array(commentDetail),
  nextCursor: z.uuid().optional(),
});

export const commentsRouter = c.router({
  list: {
    method: "GET",
    path: "/comments",
    query: listCommentsQuerySchema,
    responses: {
      200: commentListResponse,
      401: apiErrorHttp,
    },
  },
  create: {
    method: "POST",
    path: "/comments",
    body: createCommentSchema,
    responses: {
      201: z.object({ comment: commentDetail }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  update: {
    method: "PATCH",
    path: "/comments/:commentId",
    pathParams: c.type<{ commentId: string }>(),
    body: updateCommentSchema,
    responses: {
      200: z.object({ comment: commentDetail }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  remove: {
    method: "DELETE",
    path: "/comments/:commentId",
    pathParams: c.type<{ commentId: string }>(),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
});

export type CommentItem = z.infer<typeof commentItem>;
export type CommentDetail = z.infer<typeof commentDetail>;
export type CommentListResponse = z.infer<typeof commentListResponse>;
