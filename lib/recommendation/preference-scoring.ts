import { metadataList, metadataValue } from "@/lib/recommendation/scoring";

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function hasAny(value: unknown, candidates: string[] = []) {
  const normalized = normalize(value);
  return candidates.some((candidate) => {
    const entry = normalize(candidate);
    return entry && normalized && (normalized.includes(entry) || entry.includes(normalized));
  });
}

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

export function personalPreferenceScore(items: any[], input: {
  styleProfile?: any;
  memorySummary?: any;
  outfitHistorySummary?: any;
} = {}) {
  const profile = input.styleProfile || {};
  const memory = input.memorySummary || {};
  const history = input.outfitHistorySummary || {};
  const savedIds = new Set((history.savedItemIds || memory.positive?.itemIds || []).map(String));
  const rejectedIds = new Set((history.rejectedItemIds || memory.negative?.itemIds || []).map(String));
  const regeneratedIds = new Set((history.regeneratedItemIds || []).map(String));

  let score = 0;
  for (const item of items) {
    const id = itemId(item);
    const color = metadataValue(item, "primaryColor") || item.color;
    const brand = metadataValue(item, "brand") || item.brand;
    const fit = metadataValue(item, "fit") || item.fit;
    const category = normalize(item.category);
    const occasions = metadataList(item, "occasionSuitability").concat(item.occasions || []);
    const accessoryText = normalize([item.name, item.subcategory, item.category].join(" "));

    if (savedIds.has(id)) score += 7;
    if (rejectedIds.has(id)) score -= 18;
    if (regeneratedIds.has(id)) score -= 7;
    if (hasAny(color, profile.favoriteColors)) score += 7;
    if (hasAny(color, profile.dislikedColors)) score -= 16;
    if (hasAny(brand, profile.favoriteBrands)) score += 5;
    if (hasAny(brand, profile.dislikedBrands)) score -= 12;
    if (hasAny(fit, profile.preferredFits)) score += 6;
    if (hasAny(fit, profile.dislikedFits)) score -= 12;
    if ((profile.preferredCategories || []).map(normalize).includes(category)) score += 5;
    if ((profile.avoidedCategories || []).map(normalize).includes(category)) score -= 16;
    if (occasions.some((occasion: string) => hasAny(occasion, profile.preferredOccasions))) score += 4;
    if (hasAny(accessoryText, profile.favoriteAccessories || [])) score += 4;
    if (hasAny(accessoryText, profile.avoidedAccessories || [])) score -= 10;
  }

  return Math.max(-48, Math.min(48, Math.round(score)));
}
