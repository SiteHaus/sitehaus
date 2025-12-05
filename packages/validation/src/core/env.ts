import { z } from "zod";

export const EnvValidator = z.object({
  JWT_SECRET: z.string().optional(),
  JWT_SECRET_B64URL: z.string().optional(),
  JWT_ALG: z.enum(["HS256"]).default("HS256"),
  ACCESS_TTL_SEC: z.coerce.number().default(15 * 60),
  REFRESH_TTL_SEC: z.coerce.number().default(30 * 24 * 60 * 60),
});
