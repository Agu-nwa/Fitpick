function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

export function wardrobeRotationScore(items: any[], historySummary?: any) {
  if (!historySummary?.eventCount) return 8;

  const recentRecommended = new Set((historySummary.recentRecommendedItemIds || []).map(String));
  const recentlyWorn = new Set((historySummary.recentlyWornItemIds || []).map(String));
  let score = 0;

  for (const item of items) {
    const id = itemId(item);
    const recommendationCount = Number(item.recommendationCount || item.recommendationMetadata?.recommendationCount || 0);
    const timesWorn = Number(item.timesWorn || item.recommendationMetadata?.timesWorn || 0);
    if (!recentRecommended.has(id) && !recentlyWorn.has(id)) score += 5;
    if (recommendationCount <= 1 && timesWorn <= 1) score += 3;
    if (recommendationCount > 5 && timesWorn < 2) score -= 4;
    if (recentlyWorn.has(id)) score -= 8;
  }

  return Math.max(-28, Math.min(28, Math.round(score)));
}
