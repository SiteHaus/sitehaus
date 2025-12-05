export * from "./core/index.js";
export * from "./iam/index.js";

import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as core from "./core/index.js";
import * as iam from "./iam/index.js";

export {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

export const schema = {
  ...iam,
  ...core,
} as const;

export type Db = NodePgDatabase<typeof schema>;

export const createDb = (pool: Pool): Db => {
  return drizzle(pool, { schema });
};
