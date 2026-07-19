import { z } from "zod";

export const customOccasionSchema = z.object({
  name: z.string().trim().min(2).max(80),
  group: z.enum(["everyday", "formal", "social", "event", "weather"]),
  formality: z.enum(["relaxed", "balanced", "polished", "formal"])
});
