import { colorCompatibilityScore } from "@/lib/recommendation/color";
import { metadataValue } from "@/lib/recommendation/scoring";
import { outfitItemSignature } from "@/lib/recommendation/history";

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function ids(items: any[]) {
  return items.map((item) => String(item._id || item.id)).filter(Boolean);
}

function jaccard(a: string[], b: string[]) {
  const left = new Set(a.map(normalize).filter(Boolean));
  const right = new Set(b.map(normalize).filter(Boolean));
  if (!left.size && !right.size) return 0;
  const intersection = Array.from(left).filter((value) => right.has(value)).length;
  const union = new Set(Array.from(left).concat(Array.from(right))).size;
  return union ? intersection / union : 0;
}

function outfitFeatures(items: any[]) {
  return {
    itemIds: ids(items),
    categories: items.map((item) => item.category).filter(Boolean),
    colors: items.map((item) => metadataValue(item, "primaryColor") || item.color).filter(Boolean),
    silhouettes: items.map((item) => metadataValue(item, "silhouette") || item.fit || item.garmentFit).filter(Boolean),
    styles: items.map((item) => [item.subcategory, item.pattern, metadataValue(item, "garmentType"), metadataValue(item, "eventRelevance")].filter(Boolean).join(" ")).filter(Boolean),
    footwear: items.filter((item) => item.category === "shoes").map((item) => String(item._id || item.id)).filter(Boolean),
    heroItemId: String(items[0]?._id || items[0]?.id || "")
  };
}

export function outfitSimilarity(leftItems: any[] = [], rightItems: any[] = []) {
  const left = outfitFeatures(leftItems);
  const right = outfitFeatures(rightItems);
  const sharedHero = left.heroItemId && left.heroItemId === right.heroItemId ? 1 : 0;
  const sharedItems = jaccard(left.itemIds, right.itemIds);
  const categoryShape = jaccard(left.categories, right.categories);
  const colorPalette = jaccard(left.colors, right.colors);
  const silhouette = jaccard(left.silhouettes, right.silhouettes);
  const style = jaccard(left.styles, right.styles);
  const footwear = jaccard(left.footwear, right.footwear);

  return Math.max(0, Math.min(1,
    sharedItems * 0.42 +
    sharedHero * 0.16 +
    categoryShape * 0.08 +
    colorPalette * 0.12 +
    silhouette * 0.08 +
    style * 0.08 +
    footwear * 0.06
  ));
}

export function similarityToHistory(items: any[] = [], historySummary?: any) {
  const signature = outfitItemSignature(ids(items));
  if (!signature || !historySummary?.eventCount) return 0;
  if ((historySummary.recentRecommendationSignatures || []).includes(signature)) return 1;
  if ((historySummary.recentlyWornSignatures || []).includes(signature)) return 0.95;

  const currentIds = ids(items);
  const recentRecommended = new Set((historySummary.recentRecommendedItemIds || []).map(String));
  const recentlyWorn = new Set((historySummary.recentlyWornItemIds || []).map(String));
  const sharedRecommended = currentIds.filter((id) => recentRecommended.has(id)).length / Math.max(1, currentIds.length);
  const sharedWorn = currentIds.filter((id) => recentlyWorn.has(id)).length / Math.max(1, currentIds.length);
  return Math.max(sharedRecommended * 0.62, sharedWorn * 0.75);
}

export function noveltyScore(items: any[] = [], historySummary?: any) {
  return Math.round((1 - similarityToHistory(items, historySummary)) * 20);
}

export function diversifyOutfits<T extends { items: any[]; score: number; scoreBreakdown?: any; similarityMetadata?: any }>(
  outfits: T[],
  options: { limit?: number; historySummary?: any; diversityWeight?: number } = {}
) {
  const limit = Math.max(1, Math.min(options.limit || 3, 8));
  const diversityWeight = typeof options.diversityWeight === "number" ? options.diversityWeight : 0.34;
  const selected: T[] = [];
  const seenSignatures = new Set<string>();
  const candidates = outfits
    .map((outfit) => {
      const signature = outfitItemSignature(ids(outfit.items));
      const historySimilarity = similarityToHistory(outfit.items, options.historySummary);
      return {
        ...outfit,
        similarityMetadata: {
          ...(outfit.similarityMetadata || {}),
          signature,
          historySimilarity,
          colorCompatibility: colorCompatibilityScore(outfit.items)
        },
        score: outfit.score - historySimilarity * 28
      };
    })
    .filter((outfit) => outfit.similarityMetadata.signature)
    .filter((outfit) => {
      if (seenSignatures.has(outfit.similarityMetadata.signature)) return false;
      seenSignatures.add(outfit.similarityMetadata.signature);
      return true;
    });

  while (selected.length < limit && candidates.length) {
    let bestIndex = 0;
    let bestRank = Number.NEGATIVE_INFINITY;

    candidates.forEach((candidate, index) => {
      const maxSimilarity = selected.length
        ? Math.max(...selected.map((chosen) => outfitSimilarity(candidate.items, chosen.items)))
        : 0;
      const rank = candidate.score * (1 - diversityWeight) - maxSimilarity * 40 * diversityWeight;
      if (rank > bestRank) {
        bestRank = rank;
        bestIndex = index;
      }
    });

    const [chosen] = candidates.splice(bestIndex, 1);
    selected.push({
      ...chosen,
      similarityMetadata: {
        ...(chosen.similarityMetadata || {}),
        selectedRank: selected.length + 1,
        diversityAdjustedScore: Math.round(bestRank * 10) / 10
      }
    });
  }

  return selected;
}
