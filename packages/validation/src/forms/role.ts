import z from "zod";

export const createRoleSchema = z.object({
  key: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9:_-]+$/i),
  name: z.string().min(2).max(120),
  description: z.string().max(255).optional(),
  isDefault: z.boolean().optional().default(false),
});

export const updateRoleSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    description: z.string().max(255).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "No changes provided",
  });

export const replaceRolePermsSchema = z.object({
  perms: z.array(z.string().min(1)).max(500),
});
