import { metadataValue } from "@/lib/recommendation/scoring";

export type LearningEventSignal = {
  positiveItemIds: string[];
  negativeItemIds: string[];
  fatigueItemIds: string[];
  preferredColors: string[];
  avoidedColors: string[];
  preferredCategories: string[];
  avoidedCategories: string[];
  recentWeight: number;
};

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function topValues(values: string[], limit = 8) {
  const counts = new Map<string, number>();
  for (const value of values.map(normalize).filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value]) => value);
}

export function buildLearningSignals(input: {
  items?: any[];
  memorySummary?: any;
  outfitHistorySummary?: any;
} = {}): LearningEventSignal {
  const history = input.outfitHistorySummary || {};
  const memory = input.memorySummary || {};
  const itemById = new Map((input.items || []).map((item) => [String(item._id || item.id), item]));
  const positiveItemIds = Array.from(new Set([
    ...(history.savedItemIds || []),
    ...(history.wornItemIds || []),
    ...(history.explicitlyLikedItemIds || []),
    ...(memory.positive?.itemIds || [])
  ].map(String)));
  const negativeItemIds = Array.from(new Set([
    ...(history.rejectedItemIds || []),
    ...(memory.negative?.itemIds || [])
  ].map(String)));
  const fatigueItemIds = Array.from(new Set([
    ...(history.recentRecommendedItemIds || []),
    ...(history.regeneratedItemIds || [])
  ].map(String)));

  const positiveItems = positiveItemIds.map((id) => itemById.get(id)).filter(Boolean);
  const negativeItems = negativeItemIds.map((id) => itemById.get(id)).filter(Boolean);

  return {
    positiveItemIds,
    negativeItemIds,
    fatigueItemIds,
    preferredColors: topValues(positiveItems.map((item) => metadataValue(item, "primaryColor") || item.color)),
    avoidedColors: topValues(negativeItems.map((item) => metadataValue(item, "primaryColor") || item.color)),
    preferredCategories: topValues(positiveItems.map((item) => item.category)),
    avoidedCategories: topValues(negativeItems.map((item) => item.category)),
    recentWeight: history.eventCount ? Math.min(1, Math.max(0.2, 30 / Math.max(30, Number(history.eventCount)))) : 0
  };
}

export function learningSignalScore(items: any[], signals: LearningEventSignal) {
  if (!signals.recentWeight) return 0;
  let score = 0;
  for (const item of items) {
    const id = String(item._id || item.id || "");
    const color = normalize(metadataValue(item, "primaryColor") || item.color);
    const category = normalize(item.category);
    if (signals.positiveItemIds.includes(id)) score += 8;
    if (signals.negativeItemIds.includes(id)) score -= 18;
    if (signals.fatigueItemIds.includes(id)) score -= 6;
    if (signals.preferredColors.includes(color)) score += 4;
    if (signals.avoidedColors.includes(color)) score -= 10;
    if (signals.preferredCategories.includes(category)) score += 3;
    if (signals.avoidedCategories.includes(category)) score -= 9;
  }
  return Math.round(score * signals.recentWeight);
}
