import { z } from "zod";

export const wardrobePlaceholderSchema = z.object({
  name: z.string().trim().min(1).max(120).optional()
});
