import { buildLearningSignals } from "@/lib/recommendation/learning-engine";

export function buildInternalStyleProfile(input: {
  styleProfile?: any;
  wardrobeItems?: any[];
  memorySummary?: any;
  outfitHistorySummary?: any;
} = {}) {
  const base = input.styleProfile || {};
  const learning = buildLearningSignals({
    items: input.wardrobeItems,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary
  });

  return {
    ...base,
    favoriteColors: Array.from(new Set([...(base.favoriteColors || []), ...learning.preferredColors])).slice(0, 16),
    dislikedColors: Array.from(new Set([...(base.dislikedColors || []), ...learning.avoidedColors])).slice(0, 16),
    preferredCategories: Array.from(new Set([...(base.preferredCategories || []), ...learning.preferredCategories])).slice(0, 16),
    avoidedCategories: Array.from(new Set([...(base.avoidedCategories || []), ...learning.avoidedCategories])).slice(0, 16),
    learningSignals: learning,
    inferredFrom: Array.from(new Set([...(base.inferredFrom || []), learning.recentWeight ? "outfit_history" : ""].filter(Boolean)))
  };
}
