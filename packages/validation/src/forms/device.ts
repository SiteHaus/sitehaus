import { z } from "zod";

export const renameDeviceSchema = z.object({
  label: z.string().min(2).max(255),
});

export type RenameDeviceInput = z.infer<typeof renameDeviceSchema>;
