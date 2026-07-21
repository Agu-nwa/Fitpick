import { scoreOutfitDetailed } from "@/lib/recommendation/scoring";
import { calculatePreferenceBoost } from "@/lib/recommendation/learning";
import { calculateWeatherScore }
  from "@/lib/weather/weather-scoring";

function idFor(item: any) {
  return String(item?._id || item?.id || "");
}

function sortedByFreshness(items: any[]) {
  return [...items].sort((a, b) => {
    const aRecommended = a.lastRecommendedAt ? new Date(a.lastRecommendedAt).getTime() : 0;
    const bRecommended = b.lastRecommendedAt ? new Date(b.lastRecommendedAt).getTime() : 0;
    const aWorn = a.lastWornAt ? new Date(a.lastWornAt).getTime() : 0;
    const bWorn = b.lastWornAt ? new Date(b.lastWornAt).getTime() : 0;
    return (aRecommended + aWorn) - (bRecommended + bWorn);
  });
}

function optionalCandidates(items: any[], max = 4) {
  return [null, ...items.slice(0, max)];
}

export function generateCombinations(
  wardrobeItems: any[],
  categories: string[],
  scoringInput: any
) {
  const categoryMap: Record<string, any[]> = {};

  // Group wardrobe items by category
  categories.forEach((category) => {
    categoryMap[category] = sortedByFreshness(wardrobeItems
      .filter((item) => item.category === category)
    ).slice(0, 10); // Prevent combinational explosion while leaving enough variety.
  });

  const byCategory = (category: string) => categoryMap[category] || [];

  const outfits: any[] = [];
  const maxCandidates = Math.max(60, Math.min(Number(scoringInput.maxCandidates || 650), 1200));

  function pushOutfit(items: any[]) {
    if (outfits.length >= maxCandidates) return;
    const uniqueItems = items.filter(Boolean).filter((item, index, all) => all.findIndex((candidate) => String(candidate._id) === String(item._id)) === index);
    if (!uniqueItems.length) return;

    const detailed = scoreOutfitDetailed(uniqueItems, scoringInput);
    let score = detailed.total;

    for (const item of uniqueItems) {
      score += calculateWeatherScore(item, scoringInput.weather || null);
      score += calculatePreferenceBoost(item, scoringInput.preferences);
    }

    outfits.push({
      items: uniqueItems,
      score: Math.round(score * 10) / 10,
      scoreBreakdown: detailed.breakdown,
      itemSignature: uniqueItems.map(idFor).filter(Boolean).sort().join("|")
    });
  }

  for (const dress of byCategory("dresses")) {
    for (const shoe of byCategory("shoes").length ? byCategory("shoes") : [null]) {
      for (const outerwear of optionalCandidates(byCategory("outerwear"), 3)) {
        for (const accessory of optionalCandidates(byCategory("accessories"), 3)) {
          for (const bag of optionalCandidates(byCategory("bags"), 3)) {
            pushOutfit([dress, shoe, outerwear, accessory, bag]);
          }
        }
      }
    }
  }

  for (const top of byCategory("tops")) {
    for (const bottom of byCategory("bottoms").length ? byCategory("bottoms") : [null]) {
      for (const shoe of byCategory("shoes").length ? byCategory("shoes") : [null]) {
        for (const outerwear of optionalCandidates(byCategory("outerwear"), 3)) {
          for (const accessory of optionalCandidates(byCategory("accessories"), 3)) {
            for (const bag of optionalCandidates(byCategory("bags"), 3)) {
              pushOutfit([top, bottom, shoe, outerwear, accessory, bag]);
            }
          }
        }
      }
    }
  }

  return outfits.sort(
    (a, b) => b.score - a.score
  );
}
