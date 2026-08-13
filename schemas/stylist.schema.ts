import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const recommendationRegenerationSchema = z
  .object({
    requestKind: z.enum(["regenerate", "anchor"]),
    previousRecommendationId: objectId.nullable().optional(),
    previousItemIds: z.array(objectId).min(1).max(12),
    lockedItemIds: z.array(objectId).max(6).optional(),
    excludedItemIds: z.array(objectId).max(12).optional(),
    minimumCoreChanges: z.number().int().min(1).max(4).default(2),
    maximumOverlap: z.number().min(0).max(0.8).default(0.4)
  })
  .strict();

export type RecommendationRegenerationRequest = z.infer<typeof recommendationRegenerationSchema>;
