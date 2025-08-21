export * from "./core/index.js";
export * from "./iam/index.js";

import * as core from "./core/index.js";
import * as iam from "./iam/index.js";

export const schema = {
  ...iam,
  ...core,
} as const;

export type Schema = typeof schema;
