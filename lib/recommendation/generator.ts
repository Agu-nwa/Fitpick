import { scoreOutfitDetailed } from "@/lib/recommendation/scoring";
import { calculatePreferenceBoost } from "@/lib/recommendation/learning";
import { calculateWeatherScore }
  from "@/lib/weather/weather-scoring";
import { scoreItemForOccasionProfile } from "@/lib/recommendation/occasion-profiles";
import { scoreItemForTemplate } from "@/lib/recommendation/outfit-templates";
import { buildLearningSignals, learningSignalScore } from "@/lib/recommendation/learning-engine";
import { fashionKnowledgeScore } from "@/lib/recommendation/fashion-knowledge";
import { personalPreferenceScore } from "@/lib/recommendation/preference-scoring";
import { wardrobeRotationScore } from "@/lib/recommendation/rotation";
import { categoryToOutfitSlot, normalizeOutfitSlot, sanitizeOutfitItems } from "@/lib/recommendation/outfit-slots";
import { scoreCompatibilityGraph } from "@/lib/wardrobe/compatibility/compatibility-graph";

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

function optionalCandidates(items: any[], max = 4, requiredWhenAvailable = false) {
  const candidates = items.slice(0, max);
  if (requiredWhenAvailable && candidates.length) return candidates;
  return [null, ...candidates];
}

export function generateCombinations(
  wardrobeItems: any[],
  categories: string[],
  scoringInput: any
) {
  const categoryMap: Record<string, any[]> = {};

  // Group wardrobe items by category
  categories.forEach((category) => {
    const requestedSlot = categoryToOutfitSlot(category);
    categoryMap[category] = sortedByFreshness(wardrobeItems
      .filter((item) => item.category === category || normalizeOutfitSlot(item) === requestedSlot)
    ).slice(0, 10); // Prevent combinational explosion while leaving enough variety.
  });

  const byCategory = (category: string) => categoryMap[category] || [];

  const outfits: any[] = [];
  const maxCandidates = Math.max(60, Math.min(Number(scoringInput.maxCandidates || 650), 1200));

  function pushOutfit(items: any[]) {
    if (outfits.length >= maxCandidates) return;
    const uniqueItems = sanitizeOutfitItems(items.filter(Boolean)).items;
    if (!uniqueItems.length) return;

    const detailed = scoreOutfitDetailed(uniqueItems, scoringInput);
    const learningSignals = buildLearningSignals({
      items: scoringInput.wardrobeItems || [],
      memorySummary: scoringInput.memorySummary,
      outfitHistorySummary: scoringInput.outfitHistorySummary
    });
    const personalScore = personalPreferenceScore(uniqueItems, scoringInput);
    const learningScore = learningSignalScore(uniqueItems, learningSignals);
    const rotationScore = wardrobeRotationScore(uniqueItems, scoringInput.outfitHistorySummary);
    const knowledgeScore = fashionKnowledgeScore(uniqueItems, scoringInput);
    const graphScore = scoreCompatibilityGraph(uniqueItems, scoringInput.compatibilityEdges || []);
    let score = detailed.total + personalScore + learningScore + rotationScore + knowledgeScore + graphScore.score;

    for (const item of uniqueItems) {
      score += calculateWeatherScore(item, scoringInput.weather || null);
      score += calculatePreferenceBoost(item, scoringInput.preferences);
      score += scoreItemForTemplate(item, scoringInput.outfitTemplate);
      if (scoringInput.occasionProfile) {
        score += scoreItemForOccasionProfile(item, scoringInput.occasionProfile);
      }
    }

    outfits.push({
      items: uniqueItems,
      score: Math.round(score * 10) / 10,
      scoreBreakdown: {
        ...detailed.breakdown,
        personalPreference: personalScore,
        learningSignals: learningScore,
        wardrobeRotation: rotationScore,
        fashionKnowledge: knowledgeScore,
        compatibilityGraph: graphScore
      },
      itemSignature: uniqueItems.map(idFor).filter(Boolean).sort().join("|")
    });
  }

  for (const dress of byCategory("dresses")) {
    for (const shoe of byCategory("shoes").length ? byCategory("shoes") : [null]) {
      for (const outerwear of optionalCandidates(byCategory("outerwear"), 3)) {
        for (const accessory of optionalCandidates(byCategory("accessories"), 3, true)) {
          for (const bag of optionalCandidates(byCategory("bags"), 3, true)) {
            for (const hair of optionalCandidates(byCategory("womens_hair"), 2)) {
              pushOutfit([dress, shoe, outerwear, accessory, bag, hair]);
            }
          }
        }
      }
    }
  }

  for (const top of byCategory("tops")) {
    for (const bottom of byCategory("bottoms").length ? byCategory("bottoms") : [null]) {
      for (const shoe of byCategory("shoes").length ? byCategory("shoes") : [null]) {
        for (const outerwear of optionalCandidates(byCategory("outerwear"), 3)) {
          for (const accessory of optionalCandidates(byCategory("accessories"), 3, true)) {
            for (const bag of optionalCandidates(byCategory("bags"), 3, true)) {
              for (const hair of optionalCandidates(byCategory("womens_hair"), 2)) {
                pushOutfit([top, bottom, shoe, outerwear, accessory, bag, hair]);
              }
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
