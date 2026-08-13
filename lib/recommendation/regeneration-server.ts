import "server-only";

import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import type { RecommendationRegenerationContext } from "@/lib/recommendation/regeneration";

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function uniqueOwnedIds(values: unknown[] = [], ownedIds: Set<string>) {
  return Array.from(new Set(values.map(String).filter((id) => id && ownedIds.has(id))));
}

export async function resolveOwnedRegenerationContext(input: {
  userId: string;
  request?: RecommendationRegenerationContext;
  wardrobeItems: any[];
}): Promise<RecommendationRegenerationContext | undefined> {
  const request = input.request;
  if (!["regenerate", "anchor"].includes(request?.requestKind || "") || !request) return undefined;

  const ownedIds = new Set(input.wardrobeItems.map(itemId).filter(Boolean));
  let previousRecommendationId: string | null = null;
  let previousItemIds = uniqueOwnedIds(request.previousItemIds || [], ownedIds);

  if (request.previousRecommendationId) {
    const previous = await OutfitRecommendation.findOne({
      _id: request.previousRecommendationId,
      userId: input.userId
    })
      .select({ _id: 1, itemIds: 1 })
      .lean();

    if (previous) {
      previousRecommendationId = String(previous._id);
      previousItemIds = uniqueOwnedIds(previous.itemIds || [], ownedIds);
    }
  }

  if (!previousItemIds.length) return undefined;

  return {
    requestKind: request.requestKind,
    previousRecommendationId,
    previousItemIds,
    lockedItemIds: uniqueOwnedIds(request.lockedItemIds || [], ownedIds),
    excludedItemIds: uniqueOwnedIds(request.excludedItemIds || [], ownedIds),
    minimumCoreChanges: request.minimumCoreChanges,
    maximumOverlap: request.maximumOverlap
  };
}
