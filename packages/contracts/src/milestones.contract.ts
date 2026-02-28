import { milestoneStatusValues } from "@site-haus/validation/core/enums";
import {
  createMilestoneSchema,
  reorderMilestonesSchema,
  updateMilestoneSchema,
} from "@site-haus/validation/forms/milestone";
import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  apiErrorHttp,
  apiErrorValidation,
  apiErrorServer,
  dateTime,
  userBrief,
} from "./primitives.js";

const c = initContract();

export const milestoneItem = z.object({
  id: z.uuid(),
  projectId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(milestoneStatusValues),
  sortOrder: z.number(),
  dueDate: dateTime.nullable(),
  assigneeId: z.uuid().nullable(),
  completedAt: dateTime.nullable(),
  signedOffAt: dateTime.nullable(),
  signedOffBy: z.uuid().nullable(),
  createdAt: dateTime.nullable(),
  updatedAt: dateTime.nullable(),
});

export const milestoneDetail = milestoneItem.extend({
  assignee: userBrief.nullable(),
});

export const upcomingMilestoneItem = milestoneItem.extend({
  projectName: z.string(),
});

export const milestonesRouter = c.router({
  listUpcoming: {
    method: "GET",
    path: "/milestones/upcoming",
    query: z.object({
      limit: z.coerce.number().min(1).max(20).default(5).optional(),
    }),
    responses: {
      200: z.object({ milestones: z.array(upcomingMilestoneItem) }),
      401: apiErrorHttp,
      403: apiErrorHttp,
    },
  },
  list: {
    method: "GET",
    path: "/projects/:projectId/milestones",
    pathParams: c.type<{ projectId: string }>(),
    responses: {
      200: z.object({ milestones: z.array(milestoneItem) }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  create: {
    method: "POST",
    path: "/projects/:projectId/milestones",
    pathParams: c.type<{ projectId: string }>(),
    body: createMilestoneSchema,
    responses: {
      201: z.object({ milestone: milestoneItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  update: {
    method: "PATCH",
    path: "/milestones/:milestoneId",
    pathParams: c.type<{ milestoneId: string }>(),
    body: updateMilestoneSchema,
    responses: {
      200: z.object({ milestone: milestoneItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  delete: {
    method: "DELETE",
    path: "/milestones/:milestoneId",
    pathParams: c.type<{ milestoneId: string }>(),
    body: c.type<void>(),
    responses: {
      204: c.type<void>(),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  signOff: {
    method: "POST",
    path: "/milestones/:milestoneId/sign-off",
    pathParams: c.type<{ milestoneId: string }>(),
    body: c.type<void>(),
    responses: {
      200: z.object({ milestone: milestoneItem }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  reorder: {
    method: "POST",
    path: "/milestones/reorder",
    body: reorderMilestonesSchema,
    responses: {
      204: c.type<void>(),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
    },
  },
});

export type MilestoneItem = z.infer<typeof milestoneItem>;
export type MilestoneDetail = z.infer<typeof milestoneDetail>;
export type UpcomingMilestoneItem = z.infer<typeof upcomingMilestoneItem>;
