import { z } from "zod";

export const EnvValidator = z.object({
  JWT_SECRET: z.string().optional(),
  JWT_SECRET_B64URL: z.string().optional(),
  JWT_ALG: z.enum(["HS256"]).default("HS256"),
});
