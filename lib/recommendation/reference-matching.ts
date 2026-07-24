import { colorCompatibilityScore, colorNote } from "@/lib/recommendation/color";
import { evaluateOutfitCompleteness } from "@/lib/recommendation/completeness";
import { diversifyOutfits } from "@/lib/recommendation/diversity";
import { wardrobeGapInsights, wardrobeReadiness } from "@/lib/recommendation/gaps";
import { inferOccasionGroup } from "@/lib/recommendation/outfit-structures";
import { buildReasonChips } from "@/lib/recommendation/reason-chips";
import {
  fabricCompatibilityScore,
  metadataList,
  metadataValue,
  scoreOutfitDetailed,
  silhouetteBalanceScore
} from "@/lib/recommendation/scoring";
import { referenceItemToPseudoWardrobeItem, serializeReferenceFashionItem } from "@/lib/ai/reference-fashion-item";

type ReferenceMatchInput = {
  referenceItem: any;
  wardrobeItems: any[];
  message?: string;
  occasionName?: string;
  weatherContext?: string;
  styleProfile?: any;
  memorySummary?: any;
  outfitHistorySummary?: any;
  allowNeedsCare?: boolean;
  recommendationMode?: string;
  limit?: number;
};

type CategoryPlan = {
  required: string[];
  optional: string[];
};

function cleanText(value: unknown, max = 180) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function itemLabel(item: any) {
  return item.name || [item.color, item.subcategory || item.category].filter(Boolean).join(" ") || item.category || "item";
}

function displayReferenceLabel(reference: any) {
  return [
    reference.primaryColor,
    reference.subcategory || reference.category
  ].filter(Boolean).join(" ").trim() || "the uploaded item";
}

function categoryPlanFor(anchorCategory: string, occasionName = ""): CategoryPlan {
  const occasionGroup = inferOccasionGroup({ name: occasionName });
  const dressyOptional = occasionGroup === "formal" || occasionGroup === "event" ? ["outerwear", "bags", "accessories"] : ["outerwear", "accessories", "bags"];

  switch (anchorCategory) {
    case "tops":
      return { required: ["bottoms", "shoes"], optional: dressyOptional };
    case "outerwear":
      return { required: ["tops", "bottoms", "shoes"], optional: ["bags", "accessories"] };
    case "bottoms":
      return { required: ["tops", "shoes"], optional: dressyOptional };
    case "shoes":
      return { required: ["tops", "bottoms"], optional: ["outerwear", "bags", "accessories"] };
    case "dresses":
      return { required: ["shoes"], optional: ["outerwear", "bags", "accessories"] };
    case "bags":
    case "accessories":
      return { required: ["tops", "bottoms", "shoes"], optional: ["outerwear", anchorCategory === "bags" ? "accessories" : "bags"] };
    default:
      return { required: ["tops", "bottoms", "shoes"], optional: ["outerwear", "bags", "accessories"] };
  }
}

function categoryCandidates(items: any[], category: string, max = 8) {
  return items
    .filter((item) => item.category === category)
    .slice(0, max);
}

function optionalCandidates(items: any[], category: string, max = 3) {
  return [null, ...categoryCandidates(items, category, max)];
}

function referenceSimilarityScore(anchor: any, candidate: any, occasionName = "", weatherContext = "") {
  let score = 0;
  const anchorColor = String(anchor.color || metadataValue(anchor, "primaryColor") || "").toLowerCase();
  const candidateColor = String(candidate.color || metadataValue(candidate, "primaryColor") || "").toLowerCase();
  const anchorFabric = String(anchor.fabric || metadataValue(anchor, "fabricEstimate") || "").toLowerCase();
  const candidateFabric = String(candidate.fabric || metadataValue(candidate, "fabricEstimate") || "").toLowerCase();
  const candidateOccasions = metadataList(candidate, "occasionSuitability").concat(candidate.occasions || []);
  const candidateWeather = metadataList(candidate, "weatherSuitability").concat(candidate.weather || []);

  if (anchorColor && candidateColor && anchorColor !== candidateColor) score += 3;
  if (anchorColor && candidateColor && anchorColor === candidateColor) score += 1;
  if (anchorFabric && candidateFabric && anchorFabric.split(/\s+/)[0] === candidateFabric.split(/\s+/)[0]) score += 2;
  if (occasionName && candidateOccasions.some((entry: string) => occasionName.toLowerCase().includes(entry.toLowerCase()) || entry.toLowerCase().includes(occasionName.toLowerCase()))) score += 6;
  if (weatherContext && candidateWeather.some((entry: string) => weatherContext.toLowerCase().includes(entry.toLowerCase()) || entry.toLowerCase().includes(weatherContext.toLowerCase()))) score += 4;
  if (candidate.condition === "ready") score += 4;
  if (candidate.lastRecommendedAt) score -= 1;
  return score;
}

function sortCandidates(items: any[], anchor: any, occasionName = "", weatherContext = "") {
  return [...items].sort((a, b) =>
    referenceSimilarityScore(anchor, b, occasionName, weatherContext) -
    referenceSimilarityScore(anchor, a, occasionName, weatherContext)
  );
}

function makeCombinations(input: {
  anchor: any;
  wardrobeItems: any[];
  plan: CategoryPlan;
  occasionName?: string;
  weatherContext?: string;
  scoringInput: any;
}) {
  const sorted = sortCandidates(input.wardrobeItems, input.anchor, input.occasionName, input.weatherContext);
  const requiredGroups = input.plan.required.map((category) => ({
    category,
    items: categoryCandidates(sorted, category, 8)
  }));
  const optionalGroups = input.plan.optional.map((category) => ({
    category,
    items: optionalCandidates(sorted, category, 3)
  }));

  const outfits: any[] = [];

  function walkRequired(index: number, selected: any[]) {
    if (index >= requiredGroups.length) {
      walkOptional(0, selected);
      return;
    }

    const group = requiredGroups[index];
    if (!group.items.length) {
      walkRequired(index + 1, selected);
      return;
    }

    for (const item of group.items) {
      walkRequired(index + 1, [...selected, item]);
    }
  }

  function walkOptional(index: number, selected: any[]) {
    if (outfits.length >= 800) return;
    if (index >= optionalGroups.length) {
      const unique = selected.filter(Boolean).filter((item, itemIndex, all) => all.findIndex((candidate) => itemId(candidate) === itemId(item)) === itemIndex);
      if (!unique.length) return;
      const withAnchor = [input.anchor, ...unique];
      const detailed = scoreOutfitDetailed(withAnchor, input.scoringInput);
      const score = detailed.total + colorCompatibilityScore(withAnchor) + fabricCompatibilityScore(withAnchor) + silhouetteBalanceScore(withAnchor);
      outfits.push({
        items: unique,
        itemsWithAnchor: withAnchor,
        score: Math.round(score * 10) / 10,
        scoreBreakdown: detailed.breakdown,
        itemSignature: unique.map(itemId).filter(Boolean).sort().join("|")
      });
      return;
    }

    for (const item of optionalGroups[index].items) {
      walkOptional(index + 1, item ? [...selected, item] : selected);
    }
  }

  walkRequired(0, []);
  if (!outfits.length && sorted.length) {
    const fallback = sorted.slice(0, 4);
    const withAnchor = [input.anchor, ...fallback];
    const detailed = scoreOutfitDetailed(withAnchor, input.scoringInput);
    outfits.push({
      items: fallback,
      itemsWithAnchor: withAnchor,
      score: detailed.total,
      scoreBreakdown: detailed.breakdown,
      itemSignature: fallback.map(itemId).filter(Boolean).sort().join("|")
    });
  }

  return outfits.sort((a, b) => b.score - a.score);
}

function outfitPieces(referenceItem: any, wardrobeItems: any[]) {
  return [
    {
      source: "reference-upload" as const,
      role: referenceItem.category || "anchor",
      referenceItemId: String(referenceItem._id),
      category: referenceItem.category || "",
      label: displayReferenceLabel(referenceItem)
    },
    ...wardrobeItems.map((item) => ({
      source: "wardrobe" as const,
      role: item.category || "",
      wardrobeItemId: String(item._id),
      category: item.category || "",
      label: itemLabel(item)
    }))
  ];
}

function explanation(input: {
  referenceItem: any;
  items: any[];
  itemsWithAnchor: any[];
  occasion: string;
  missingCategories: string[];
}) {
  const anchor = displayReferenceLabel(input.referenceItem);
  const itemNames = input.items.map(itemLabel).slice(0, 5);
  const fabrics = input.itemsWithAnchor
    .map((item) => metadataValue(item, "fabricComposition") || metadataValue(item, "fabricEstimate") || item.fabric)
    .filter(Boolean);
  const silhouettes = input.itemsWithAnchor
    .map((item) => metadataValue(item, "silhouette") || item.fit)
    .filter(Boolean);

  return {
    occasionFit: `Built around ${anchor} for ${input.occasion}.`,
    whyItWorks: `${anchor} anchors the look, while ${itemNames.join(", ") || "your saved closet items"} complete the outfit from your closet.`,
    materialNote: fabrics.length
      ? `Material read: ${Array.from(new Set(fabrics)).slice(0, 3).join(", ")}.`
      : "Material detail is limited, so MyFitPick matched the look by category, color, and occasion.",
    silhouetteNote: silhouettes.length
      ? `Silhouette read: ${Array.from(new Set(silhouettes)).slice(0, 3).join(", ")}.`
      : "Fit detail is limited, so MyFitPick keeps the styling balanced and practical.",
    improvementNote: input.missingCategories.length
      ? `This would improve with saved ${input.missingCategories.join(" and ")} options.`
      : "No major closet gap detected for this photo match.",
    stylingTips: [
      "Let the uploaded item lead the outfit.",
      "Keep supporting pieces clean so the look feels intentional.",
      "Use accessories only when they add polish without crowding the anchor item."
    ]
  };
}

function confidenceFromScore(score: number) {
  if (score >= 175) return "Strong match";
  if (score >= 105) return "Good match";
  return "Needs review";
}

function boundedConfidence(score: number) {
  return Math.max(0, Math.min(1, Math.round((score / 220) * 100) / 100));
}

export function buildReferenceOutfitRecommendations(input: ReferenceMatchInput) {
  const referenceItem = input.referenceItem;
  const anchor = referenceItemToPseudoWardrobeItem(referenceItem);
  const occasion = cleanText(input.occasionName || input.message || referenceItem.occasions?.[0] || "Today", 120) || "Today";
  const available = input.wardrobeItems.filter((item) => {
    if (item.archivedAt) return false;
    if (item.condition === "needs-care" && !input.allowNeedsCare) return false;
    return true;
  });
  const plan = categoryPlanFor(referenceItem.category || "", occasion);
  const scoringInput = {
    occasionName: occasion,
    weatherContext: input.weatherContext,
    seasonContext: input.weatherContext,
    repeatDays: 14,
    allowNeedsCare: input.allowNeedsCare,
    desiredCategories: [anchor.category, ...plan.required],
    styleProfile: input.styleProfile,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary,
    allowRecentRepeat: /repeat|again|same look|rewear/i.test(occasion),
    recommendationMode: input.recommendationMode || "photo_match"
  };
  const combinations = makeCombinations({
    anchor,
    wardrobeItems: available,
    plan,
    occasionName: occasion,
    weatherContext: input.weatherContext,
    scoringInput
  });
  const diverse = diversifyOutfits(combinations, { limit: input.limit || 3, historySummary: input.outfitHistorySummary, diversityWeight: 0.38 });
  const selected = diverse.length ? diverse : combinations.slice(0, input.limit || 3);
  const readiness = wardrobeReadiness(available);
  const gapInsights = wardrobeGapInsights(available, occasion);

  if (!selected.length) {
    return [{
      title: `Match for ${displayReferenceLabel(referenceItem)}`,
      occasion,
      confidence: "Needs review",
      summary: "I could not find enough saved closet items to build around this photo yet.",
      items: [],
      reasonChips: ["Photo anchor", "Closet limited"],
      weatherContext: input.weatherContext || "",
      repetitionNote: "",
      careNote: "",
      colorNote: "",
      occasionFit: "More saved closet items are needed before MyFitPick can style this photo properly.",
      whyItWorks: "MyFitPick did not find enough compatible saved closet pieces.",
      materialNote: "",
      silhouetteNote: "",
      improvementNote: "Add more closet items or try a simpler occasion.",
      addLater: "Optional add later: versatile basics that work with this item.",
      confidenceScore: 0,
      completenessStatus: "missing_core_item",
      missingCategories: plan.required,
      completenessWarnings: ["More saved closet items are needed for a complete outfit."],
      footwearIncluded: false,
      stylingTips: ["Add more saved closet items, then match this photo again."],
      recommendationMode: "photo_match",
      styleIntent: "Photo Match",
      freshnessCue: "Freshness starts after more photo matches are generated.",
      wardrobeReadiness: readiness,
      gapInsights,
      scoreBreakdown: {},
      similarityMetadata: { referenceItemId: String(referenceItem._id), source: "reference-upload" },
      candidateCount: combinations.length,
      diverseCandidateCount: selected.length,
      alternatives: [],
      outfitPieces: outfitPieces(referenceItem, []),
      referenceItems: [serializeReferenceFashionItem(referenceItem)]
    }];
  }

  return selected.map((candidate, index) => {
    const completeness = evaluateOutfitCompleteness(candidate.itemsWithAnchor);
    const missing = completeness.missingCategories;
    const notes = explanation({ referenceItem, items: candidate.items, itemsWithAnchor: candidate.itemsWithAnchor, occasion, missingCategories: missing });
    const chips = buildReasonChips({
      occasionReady: candidate.items.length >= 2,
      colorBalanced: colorCompatibilityScore(candidate.itemsWithAnchor) >= 13,
      weatherAware: Boolean(input.weatherContext),
      fresh: true,
      comfort: candidate.itemsWithAnchor.some((item: any) => /comfort|soft|relaxed/i.test(`${item.fit || ""} ${metadataValue(item, "fabricEstimate") || ""}`)),
      polished: candidate.itemsWithAnchor.some((item: any) => ["shoes", "outerwear", "accessories", "bags"].includes(item.category)),
      eventAware: /wedding|dinner|formal|church|event/i.test(occasion)
    });

    return {
      title: index === 0 ? `${displayReferenceLabel(referenceItem)} outfit` : `${displayReferenceLabel(referenceItem)} option ${index + 1}`,
      occasion,
      confidence: confidenceFromScore(candidate.score),
      summary: `${notes.whyItWorks}${missing.length ? ` Missing ${missing.join(", ")} keeps it from being fully complete.` : ""}`,
      items: candidate.items,
      reasonChips: ["Photo anchor", ...chips].slice(0, 8),
      weatherContext: input.weatherContext || "",
      repetitionNote: "Photo matches are rotated as you keep styling.",
      careNote: candidate.items.some((item: any) => item.condition === "needs-care") ? "One closet item may need care before wearing." : "Selected closet items are marked ready.",
      colorNote: colorNote(candidate.itemsWithAnchor),
      ...notes,
      addLater: missing.length ? `Optional add later: ${missing[0]}.` : "",
      confidenceScore: boundedConfidence(candidate.score),
      completenessStatus: completeness.completenessStatus,
      missingCategories: missing,
      completenessWarnings: completeness.completenessWarnings,
      footwearIncluded: completeness.footwearIncluded,
      recommendationMode: "photo_match",
      styleIntent: "Photo Match",
      freshnessCue: "Built as a fresh photo-led closet match.",
      wardrobeReadiness: readiness,
      gapInsights,
      scoreBreakdown: candidate.scoreBreakdown || {},
      similarityMetadata: {
        referenceItemId: String(referenceItem._id),
        source: "reference-upload",
        anchorCategory: referenceItem.category || "",
        itemSignature: candidate.itemSignature
      },
      candidateCount: combinations.length,
      diverseCandidateCount: selected.length,
      alternatives: selected.slice(1).map((alternative) => ({
        title: `${displayReferenceLabel(referenceItem)} alternative`,
        itemIds: alternative.items.map(itemId),
        similarityMetadata: { referenceItemId: String(referenceItem._id), source: "reference-upload" }
      })),
      outfitPieces: outfitPieces(referenceItem, candidate.items),
      referenceItems: [serializeReferenceFashionItem(referenceItem)]
    };
  });
}
