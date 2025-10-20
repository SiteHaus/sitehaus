import { z } from "zod";

export const createContactSchema = z.object({
  firstName: z.string().min(2, "First Name is required"),
  lastName: z.string().min(2, "Last Name is required"),
  phoneNumber: z
    .string()
    .min(9, "A full phone number must be at least 9 digits")
    .max(15, "Phone number is too long"), // optional, depends on format
  email: z.email({ message: "Invalid email address" }),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;
