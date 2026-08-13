export function buildOutfitHistorySummary(history: any[] = []) {
  const recentRecommendations = history.slice(0, 30);
  const recentlyWorn = history.filter((entry) => entry.wornAt).slice(0, 30);
  const rejected = history.filter((entry) => entry.rejectedAt).slice(0, 30);
  const saved = history.filter((entry) => entry.savedAt || entry.acceptedAt).slice(0, 30);
  const regenerated = history.filter((entry) => entry.swappedAt || entry.editedAt).slice(0, 30);
  const recentRecommendationItemIdLists: string[][] = recentRecommendations
    .map((entry) => Array.from(new Set<string>((entry.itemIds || []).map((id: unknown) => String(id)).filter(Boolean))))
    .filter((entry) => entry.length);
  const recentItemRecommendationCounts = recentRecommendationItemIdLists.flat().reduce<Record<string, number>>((counts, id) => {
    counts[id] = (counts[id] || 0) + 1;
    return counts;
  }, {});
  const explicitRejectedItemIds = Array.from(new Set<string>(rejected.flatMap((entry) =>
    (entry.itemFeedback || []).filter((feedback: any) => feedback.liked === false).map((feedback: any) => String(feedback.itemId))
  ))).slice(0, 80);
  const explicitlyLikedItemIds = Array.from(new Set<string>(history.flatMap((entry) =>
    (entry.itemFeedback || []).filter((feedback: any) => feedback.liked === true).map((feedback: any) => String(feedback.itemId))
  ))).slice(0, 80);

  return {
    eventCount: history.length,
    recentRecommendationSignatures: recentRecommendations.map((entry) => entry.itemSignature).filter(Boolean),
    recentRecommendationItemIdLists,
    lastRecommendationItemIds: recentRecommendationItemIdLists[0] || [],
    recentItemRecommendationCounts,
    recentlyWornSignatures: recentlyWorn.map((entry) => entry.itemSignature).filter(Boolean),
    rejectedSignatures: rejected.map((entry) => entry.itemSignature).filter(Boolean),
    savedSignatures: saved.map((entry) => entry.itemSignature).filter(Boolean),
    recentRecommendedItemIds: Array.from(new Set(recentRecommendations.flatMap((entry) => (entry.itemIds || []).map(String)))).slice(0, 80),
    recentlyWornItemIds: Array.from(new Set(recentlyWorn.flatMap((entry) => (entry.itemIds || []).map(String)))).slice(0, 80),
    rejectedItemIds: explicitRejectedItemIds,
    explicitlyLikedItemIds,
    savedItemIds: Array.from(new Set(saved.flatMap((entry) => (entry.itemIds || []).map(String)))).slice(0, 80),
    wornItemIds: Array.from(new Set(recentlyWorn.flatMap((entry) => (entry.itemIds || []).map(String)))).slice(0, 80),
    regeneratedItemIds: Array.from(new Set(regenerated.flatMap((entry) => (entry.itemIds || []).map(String)))).slice(0, 80),
    lastGeneratedAt: recentRecommendations[0]?.generatedAt ? new Date(recentRecommendations[0].generatedAt).toISOString() : null
  };
}
