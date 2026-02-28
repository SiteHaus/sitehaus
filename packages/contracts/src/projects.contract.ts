import {
  projectBillingStatusValues,
  projectStatusValues,
  projectTypeValues,
} from "@site-haus/validation/core/enums";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  projectStatusTransitionSchema,
  updateProjectSchema,
} from "@site-haus/validation/forms/project";
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

export const projectItem = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  userId: z.uuid().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  status: z.enum(projectStatusValues),
  type: z.enum(projectTypeValues),
  siteDomain: z.string().nullable(),
  stagingDomain: z.string().nullable(),
  repoUrl: z.string().nullable(),
  isActive: z.boolean().nullable(),
  startDate: dateTime.nullable(),
  dueDate: dateTime.nullable(),
  launchedAt: dateTime.nullable(),
  monthlyRateCents: z.number().nullable(),
  depositAmountCents: z.number().nullable(),
  billingStatus: z.enum(projectBillingStatusValues).nullable(),
  createdAt: dateTime.nullable(),
  updatedAt: dateTime.nullable(),
});

export const projectDetail = projectItem.extend({
  client: z
    .object({
      id: z.uuid(),
      name: z.string(),
    })
    .nullable(),
  creator: userBrief.nullable(),
  milestoneCount: z.number(),
  ticketCount: z.number(),
  openTicketCount: z.number(),
});

export const projectListResponse = z.object({
  projects: z.array(projectItem),
  nextCursor: z.uuid().optional(),
});

export const projectsRouter = c.router({
  list: {
    method: "GET",
    path: "/projects",
    query: listProjectsQuerySchema,
    responses: {
      200: projectListResponse,
      401: apiErrorHttp,
      403: apiErrorHttp,
    },
  },
  get: {
    method: "GET",
    path: "/projects/:projectId",
    pathParams: c.type<{ projectId: string }>(),
    responses: {
      200: z.object({ project: projectDetail }),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  create: {
    method: "POST",
    path: "/projects",
    body: createProjectSchema,
    responses: {
      201: z.object({ project: projectItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      500: apiErrorServer,
    },
  },
  update: {
    method: "PATCH",
    path: "/projects/:projectId",
    pathParams: c.type<{ projectId: string }>(),
    body: updateProjectSchema,
    responses: {
      200: z.object({ project: projectItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  remove: {
    method: "DELETE",
    path: "/projects/:projectId",
    pathParams: c.type<{ projectId: string }>(),
    body: c.noBody(),
    responses: {
      204: c.noBody(),
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
  transitionStatus: {
    method: "PATCH",
    path: "/projects/:projectId/status",
    pathParams: c.type<{ projectId: string }>(),
    body: projectStatusTransitionSchema,
    responses: {
      200: z.object({ project: projectItem }),
      400: apiErrorValidation,
      401: apiErrorHttp,
      403: apiErrorHttp,
      404: apiErrorHttp,
    },
  },
});

export type ProjectItem = z.infer<typeof projectItem>;
export type ProjectDetail = z.infer<typeof projectDetail>;
export type ProjectListResponse = z.infer<typeof projectListResponse>;
