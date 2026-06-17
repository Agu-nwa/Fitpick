import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().trim().url().max(500).optional().or(z.literal(""))
});
