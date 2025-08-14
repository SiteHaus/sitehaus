import { InferSelectModel } from "drizzle-orm";
import {
  projectBillingStatusEnum,
  projectsTable,
  projectStatusEnum,
  projectTypeEnum,
} from "./core/schema.js";
import { rolesEnum } from "./iam/users.js";

export type UserRole = (typeof rolesEnum.enumValues)[number];
export type Project = InferSelectModel<typeof projectsTable>;
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type ProjectType = (typeof projectTypeEnum.enumValues)[number];
export type ProjectBillingStatus =
  (typeof projectBillingStatusEnum.enumValues)[number];

export type { InferInsertModel, InferSelectModel } from "drizzle-orm";
