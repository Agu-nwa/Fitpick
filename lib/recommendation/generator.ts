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
import { categoryToOutfitSlot, normalizeOutfitSlot, outfitSlotsForItem, sanitizeOutfitItems } from "@/lib/recommendation/outfit-slots";
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

export const SLOT_CANDIDATE_QUOTA = 16;
export const CORE_BEAM_WIDTH = 180;
export const CORE_PAIR_BEAM_WIDTH = 72;

function balancedSlotCandidates(items: any[], scoringInput: any, quota = SLOT_CANDIDATE_QUOTA) {
  const ranked = [...items].sort((a, b) => {
    const score = (item: any) => scoreItemForTemplate(item, scoringInput.outfitTemplate) + (scoringInput.occasionProfile ? scoreItemForOccasionProfile(item, scoringInput.occasionProfile) : 0);
    return score(b) - score(a) || idFor(a).localeCompare(idFor(b));
  });
  const fresh = sortedByFreshness(items);
  const subtypeRepresentatives = new Map<string, any>();
  for (const item of ranked) {
    const key = String(item.canonicalSubtype || item.subcategory || item.category || "unknown").toLowerCase();
    if (!subtypeRepresentatives.has(key)) subtypeRepresentatives.set(key, item);
  }
  const rankedChoices = ranked.slice(0, Math.ceil(quota / 2));
  const freshChoices = fresh.slice(0, Math.ceil(quota / 4));
  const subtypeChoices = Array.from(subtypeRepresentatives.values()).slice(0, Math.ceil(quota / 4));
  const selected: any[] = [];
  const seen = new Set<string>();
  const add = (item: any) => {
    const id = idFor(item);
    if (!id || seen.has(id) || selected.length >= quota) return;
    seen.add(id);
    selected.push(item);
  };
  const depth = Math.max(rankedChoices.length, freshChoices.length, subtypeChoices.length);
  for (let index = 0; index < depth && selected.length < quota; index += 1) {
    add(rankedChoices[index]);
    add(freshChoices[index]);
    add(subtypeChoices[index]);
  }
  for (const item of ranked) add(item);
  return selected;
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
    categoryMap[category] = balancedSlotCandidates(wardrobeItems
      .filter((item) => item.category === category || outfitSlotsForItem(item).includes(requestedSlot))
    , scoringInput); // Balanced top-ranked, rotation-ready, and subtype-diverse coverage.
  });

  const byCategory = (category: string) => categoryMap[category] || [];

  const outfits: any[] = [];
  const maxCandidates = Math.max(60, Math.min(Number(scoringInput.maxCandidates || 650), 1200));
  const learningSignals = scoringInput.learningSignals || buildLearningSignals({
    items: scoringInput.wardrobeItems || [],
    memorySummary: scoringInput.memorySummary,
    outfitHistorySummary: scoringInput.outfitHistorySummary
  });

  function pushOutfit(items: any[]) {
    if (outfits.length >= maxCandidates) return;
    const uniqueItems = sanitizeOutfitItems(items.filter(Boolean)).items;
    if (!uniqueItems.length) return;

    const detailed = scoreOutfitDetailed(uniqueItems, scoringInput);
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

  const footwear = byCategory("shoes").length ? byCategory("shoes") : [null];
  const topBottomPairs: any[][] = [];
  for (const top of byCategory("tops")) for (const bottom of byCategory("bottoms")) topBottomPairs.push([top, bottom]);
  const rankedTopBottomPairs = topBottomPairs
    .map((items) => ({ items, score: scoreOutfitDetailed(items.filter(Boolean), scoringInput).total }))
    .sort((a, b) => b.score - a.score || a.items.map(idFor).join("|").localeCompare(b.items.map(idFor).join("|")))
    .slice(0, CORE_PAIR_BEAM_WIDTH);

  const coreCandidates: any[][] = [];
  for (const onePiece of byCategory("dresses")) for (const shoe of footwear) coreCandidates.push([onePiece, shoe]);
  for (const pair of rankedTopBottomPairs) for (const shoe of footwear) coreCandidates.push([...pair.items, shoe]);
  const rankedCore = coreCandidates
    .map((items) => ({ items, score: scoreOutfitDetailed(items.filter(Boolean), scoringInput).total }))
    .sort((a, b) => b.score - a.score || a.items.map(idFor).join("|").localeCompare(b.items.map(idFor).join("|")))
    .slice(0, CORE_BEAM_WIDTH);
  for (const core of rankedCore) {
    for (const outerwear of optionalCandidates(byCategory("outerwear"), 8)) pushOutfit([...core.items, outerwear]);
    if (outfits.length >= maxCandidates) break;
  }

  return outfits.sort(
    (a, b) => b.score - a.score
  );
}
