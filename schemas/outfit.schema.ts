import { z } from "zod";

export const outfitRecommendationRequestSchema = z.object({
  occasionId: z.string().trim().min(1).optional(),
  occasionName: z.string().trim().min(2).max(80).optional(),
  weatherContext: z.string().trim().max(120).optional()
});
