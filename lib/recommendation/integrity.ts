import { normalizeOutfitSlot, sanitizeOutfitItems, type OutfitSlot } from "@/lib/recommendation/outfit-slots";
import { serializeWardrobeItem } from "@/lib/wardrobe";

export type RecommendationPieceRole = "top" | "bottom" | "dress" | "outerwear" | "footwear" | "bag" | "accessory";

export type RecommendationPiece = {
  wardrobeItemId: string;
  category: string;
  subtype?: string;
  displayName: string;
  role: RecommendationPieceRole;
  imageUrl?: string;
  hasUsableImage: boolean;
};

const roleBySlot: Record<Exclude<OutfitSlot, "unknown">, RecommendationPieceRole> = {
  top: "top",
  bottom: "bottom",
  onePiece: "dress",
  outerwear: "outerwear",
  shoes: "footwear",
  bag: "bag",
  accessory: "accessory"
};

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

export function recommendationRole(item: any): RecommendationPieceRole {
  const slot = normalizeOutfitSlot(item);
  return slot === "unknown" ? "accessory" : roleBySlot[slot];
}

export function buildRecommendationPieces(items: any[] = []): RecommendationPiece[] {
  return items.filter(Boolean).map((item) => {
    const serialized = serializeWardrobeItem(item);
    const imageUrl = serialized.thumbnailUrl || serialized.imageUrl || "";
    return {
      wardrobeItemId: itemId(item),
      category: serialized.category || "accessories",
      subtype: serialized.canonicalSubtype || serialized.subcategory || undefined,
      displayName: serialized.name || "Closet item",
      role: recommendationRole(item),
      ...(imageUrl ? { imageUrl } : {}),
      hasUsableImage: Boolean(imageUrl)
    };
  });
}

export function finalizeRecommendationItems(items: any[] = []) {
  const sanitized = sanitizeOutfitItems(items);
  const ids = sanitized.items.map(itemId).filter(Boolean);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length || ids.length !== sanitized.items.length) {
    throw new Error("Recommendation finalization produced invalid wardrobe-item references.");
  }
  return {
    items: sanitized.items,
    pieces: buildRecommendationPieces(sanitized.items),
    removed: sanitized.removed
  };
}

export function constrainStylistToFinalizedRecommendation(response: any, recommendation: any) {
  const finalItems = Array.isArray(recommendation?.items) ? recommendation.items : [];
  const finalIds = finalItems.map(itemId).filter(Boolean);
  const finalSet = new Set(finalIds);
  const requested = Array.isArray(response?.recommendedItemIds) ? response.recommendedItemIds.map(String) : [];
  const removedIds = requested.filter((id: string) => !finalSet.has(id));
  const safeTips = Array.isArray(recommendation?.stylingTips) ? recommendation.stylingTips : [];
  const message = recommendation?.whyItWorks || recommendation?.summary || response?.message || "I found a grounded outfit from your wardrobe.";

  return {
    ...response,
    message,
    recommendedItemIds: finalIds,
    alternativeItemIds: (response?.alternativeItemIds || []).map(String).filter((id: string) => finalSet.has(id)),
    stylingTips: safeTips,
    safetyWarnings: [
      ...(Array.isArray(response?.safetyWarnings) ? response.safetyWarnings : []),
      ...(removedIds.length ? ["Removed stylist references outside the finalized outfit."] : [])
    ].slice(0, 5)
  };
}

export function recommendationIntegrityDiagnostics(input: {
  finalizedItems: any[];
  persistedItemIds?: unknown[];
  serializedItems?: any[];
  stylingItemIds?: unknown[];
}) {
  const finalizedIds = input.finalizedItems.map(itemId).filter(Boolean);
  const persistedIds = (input.persistedItemIds || []).map(String).filter(Boolean);
  const serializedIds = (input.serializedItems || []).map(itemId).filter(Boolean);
  const stylingIds = (input.stylingItemIds || []).map(String).filter(Boolean);
  const missing = (expected: string[], actual: string[]) => expected.filter((id) => !new Set(actual).has(id));
  return {
    valid: new Set(finalizedIds).size === finalizedIds.length &&
      missing(finalizedIds, persistedIds).length === 0 &&
      missing(finalizedIds, serializedIds).length === 0 &&
      missing(persistedIds, serializedIds).length === 0 &&
      missing(stylingIds, finalizedIds).length === 0,
    finalizedItemIds: finalizedIds,
    persistedItemIds: persistedIds,
    serializedItemIds: serializedIds,
    stylingItemIds: stylingIds,
    missingPersistedItemIds: missing(finalizedIds, persistedIds),
    missingSerializedItemIds: missing(finalizedIds, serializedIds),
    missingLoadedItemIds: missing(persistedIds, serializedIds),
    invalidStylingItemIds: missing(stylingIds, finalizedIds)
  };
}

export function logRecommendationIntegrity(recommendationId: string, diagnostics: ReturnType<typeof recommendationIntegrityDiagnostics>) {
  console.info("fitpick.recommendation.integrity", {
    recommendationId,
    status: diagnostics.valid ? "valid" : "invalid",
    finalizedItemIds: diagnostics.finalizedItemIds,
    persistedItemIds: diagnostics.persistedItemIds,
    serializedItemIds: diagnostics.serializedItemIds,
    stylingItemIds: diagnostics.stylingItemIds,
    missingPersistedItemIds: diagnostics.missingPersistedItemIds,
    missingLoadedItemIds: diagnostics.missingLoadedItemIds,
    invalidStylingItemIds: diagnostics.invalidStylingItemIds
  });
}
