import { colorCompatibilityScore, colorNote } from "@/lib/recommendation/color";
import { completenessLabel, evaluateOutfitCompleteness } from "@/lib/recommendation/completeness";
import { diversifyOutfits, noveltyScore } from "@/lib/recommendation/diversity";
import { wardrobeGapInsights, wardrobeReadiness } from "@/lib/recommendation/gaps";
import { inferOccasionGroup, missingCoreCategories, structureFor } from "@/lib/recommendation/outfit-structures";
import { modeLabel, normalizeRecommendationMode } from "@/lib/recommendation/policy";
import { buildReasonChips } from "@/lib/recommendation/reason-chips";
import {
  fabricCompatibilityScore,
  metadataList,
  metadataValue,
  scoreOutfit,
  silhouetteBalanceScore
} from "@/lib/recommendation/scoring";
import { generateCombinations } from "@/lib/recommendation/generator";
import { serializeWardrobeItem } from "@/lib/wardrobe";

export function repeatWindowDays(preference?: string) {
  if (preference === "high") return 30;
  if (preference === "low") return 7;
  return 14;
}

function freshnessNote(items: any[], repeatDays: number) {
  const recent = items.filter(
    (item) =>
      item.lastWornAt &&
      (Date.now() - new Date(item.lastWornAt).getTime()) / 86_400_000 <
      repeatDays
  );

  if (!recent.length) return "No recent repeat found.";

  return "One item was worn recently; consider swapping if repeat sensitivity matters today.";
}

function careNote(items: any[]) {
  return items.some((item) => item.condition === "needs-care")
    ? "One item may need care before wearing."
    : "Selected items are marked ready.";
}

function isWeatherAware(items: any[], weatherContext = "") {
  if (!weatherContext) return false;

  const target = weatherContext.toLowerCase();

  return items.some((item) =>
    item.weather?.some(
      (tag: string) =>
        target.includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(target)
    )
  );
}

function itemLabel(item: any) {
  return item.name || [item.color, item.subcategory || item.category].filter(Boolean).join(" ") || item.category;
}

function hasEventSignal(items: any[]) {
  return items.some((item) =>
    [
      item.category,
      item.subcategory,
      metadataValue(item, "garmentType"),
      metadataValue(item, "eventRelevance"),
      metadataValue(item, "pattern"),
      metadataValue(item, "fabricEstimate")
    ]
      .join(" ")
      .toLowerCase()
      .match(/wedding|church|ceremony|celebration|party|graduation|gala|formal|dressy|statement|evening/)
  );
}

function confidenceFromScore(score: number) {
  if (score >= 185) return "Strong match";
  if (score >= 115) return "Good match";
  return "Needs review";
}

function boundedConfidenceScore(score: number) {
  return Math.max(0, Math.min(1, Math.round((score / 220) * 100) / 100));
}

function buildFashionExplanation(input: {
  items: any[];
  occasion: string;
  occasionGroup: string;
  weatherContext?: string;
  missing: string[];
  score: number;
}) {
  const itemNames = input.items.map(itemLabel);
  const fabrics = input.items
    .map((item) => metadataValue(item, "fabricComposition") || metadataValue(item, "fabricEstimate") || item.fabric)
    .filter(Boolean);
  const silhouettes = input.items
    .map((item) => metadataValue(item, "silhouette") || item.fit)
    .filter(Boolean);
  const eventReady = hasEventSignal(input.items);
  const missingText = input.missing.length ? ` Missing ${input.missing.join(", ")} keeps this from being fully complete.` : "";

  return {
    occasionFit:
      input.occasionGroup === "event" || eventReady
        ? "Built from owned wardrobe pieces that can hold up for the event."
        : `Built from owned wardrobe pieces for ${input.occasion}.`,
    whyItWorks: `${itemNames.join(", ")} create a wearable ${input.occasion.toLowerCase()} look from actual wardrobe items.${missingText}`,
    materialNote: fabrics.length
      ? `Material read: ${fabrics.slice(0, 3).join(", ")}. Compatibility score ${fabricCompatibilityScore(input.items)}.`
      : "Fabric data is limited, so MyFitPick used category and occasion fallback logic.",
    silhouetteNote: silhouettes.length
      ? `Silhouette read: ${silhouettes.slice(0, 3).join(", ")}. Balance score ${silhouetteBalanceScore(input.items)}.`
      : "Silhouette data is limited, so MyFitPick avoided overclaiming fit balance.",
    improvementNote: input.missing.length
      ? `This outfit would improve with owned ${input.missing.join(" and ")} options.`
      : "No major wardrobe gap detected for this recommendation.",
    addLater: input.missing.length
      ? `Optional add later: a versatile ${input.missing[0]} that matches your wardrobe.`
      : "",
    stylingTips: [
      input.occasionGroup === "formal" ? "Keep grooming and footwear polished for the event." : "Keep proportions clean and intentional.",
      eventReady ? "Let the strongest piece lead; keep supporting items restrained." : "Use accessories only if they support the outfit, not compete with it.",
      input.weatherContext ? "Check weather before leaving and swap outerwear if needed." : "Review weather before wearing."
    ]
  };
}

export type EngineInput = {
  occasionName?: string;
  occasionGroup?: string;
  formality?: string;
  weatherContext?: string;
  allowNeedsCare?: boolean;
  styleDirection?: string;
  preferences?: any;
  styleProfile?: any;
  memorySummary?: any;
  wardrobeItems: any[];
  previousLooks?: any[];
  wornLooks?: any[];
  weather?: any;
  outfitHistorySummary?: any;
  recommendationMode?: string;
  traceId?: string;
};

export function buildRecommendation(input: EngineInput) {
  const repeatDays = repeatWindowDays(
    input.preferences?.repeatSensitivity
  );
  const allowRecentRepeat = /repeat|again|same look|rewear/i.test(`${input.occasionName || ""} ${input.styleDirection || ""}`);
  const recommendationMode = normalizeRecommendationMode(input.recommendationMode || input.styleDirection || input.occasionName || "todays_best");
  const modeTitle = modeLabel(recommendationMode);

  const occasionGroup = inferOccasionGroup({
    name: input.occasionName,
    group: input.occasionGroup,
    weatherContext: input.weatherContext
  });

  const desiredStructure = structureFor(occasionGroup);

  const available = input.wardrobeItems.filter((item) => {
    if (item.archivedAt) return false;

    if (
      item.condition === "needs-care" &&
      !input.allowNeedsCare
    ) {
      return false;
    }

    return true;
  });

  const readyFirst = available
    .filter((item) => item.condition !== "missing-tags")
    .concat(
      available.filter(
        (item) => item.condition === "missing-tags"
      )
    );

  // Generate and score outfit combinations

  const missing = missingCoreCategories(readyFirst, desiredStructure);
  const readiness = wardrobeReadiness(readyFirst);
  const gapInsights = wardrobeGapInsights(readyFirst, input.occasionName || input.weatherContext || "");

  const combinations = generateCombinations(
    readyFirst,
    desiredStructure,
    {
      occasionName: input.occasionName,
      formality: input.formality,
      weatherContext: input.weatherContext,
      seasonContext: input.weatherContext,
      repeatDays,
      allowNeedsCare: input.allowNeedsCare,
      desiredCategories: desiredStructure,
      styleProfile: input.styleProfile,
      memorySummary: input.memorySummary,
      outfitHistorySummary: input.outfitHistorySummary,
      allowRecentRepeat,
      previousLooks: input.previousLooks || [],
      recommendationMode,
      weather: input.weather,
      preferences: input.preferences,
      maxCandidates: 650
    }
  );

  const diverseOutfits = diversifyOutfits(combinations, {
    limit: 3,
    historySummary: input.outfitHistorySummary,
    diversityWeight: recommendationMode === "todays_best" ? 0.3 : 0.42
  });

  const bestOutfit = diverseOutfits[0] || combinations[0];

  const coreItems: any[] = bestOutfit?.items || [];

  if (!coreItems.length) {
    const completeness = evaluateOutfitCompleteness([]);
    return {
      title: "No outfit found",
      occasion: input.occasionName || "Today",
      confidence: "Needs review",
      summary:
        "Add more wardrobe items to receive recommendations.",
      items: [],
      reasonChips: [],
      weatherContext: input.weatherContext || "",
      repetitionNote: "",
      careNote: "",
      colorNote: "",
      swapGroups: [],
      occasionFit: "No suitable owned wardrobe combination was found.",
      whyItWorks: "MyFitPick could not assemble a complete look from the currently available owned items.",
      materialNote: "",
      silhouetteNote: "",
      improvementNote: missing.length ? `Add or verify ${missing.join(", ")} items for better outfit ideas.` : "Add more verified wardrobe details.",
      addLater: missing.length ? `Optional add later: ${missing[0]}.` : "",
      confidenceScore: 0,
      completenessStatus: completeness.completenessStatus,
      missingCategories: completeness.missingCategories,
      completenessWarnings: completeness.completenessWarnings,
      footwearIncluded: completeness.footwearIncluded,
      stylingTips: ["Add more verified wardrobe items, then request this occasion again."],
      recommendationMode,
      styleIntent: modeTitle,
      freshnessCue: "Rotation starts after more complete outfits are available.",
      wardrobeReadiness: readiness,
      gapInsights,
      candidateCount: combinations.length,
      diverseCandidateCount: diverseOutfits.length,
      scoreBreakdown: {},
      similarityMetadata: {},
      alternatives: []
    };
  }

  const completeness = evaluateOutfitCompleteness(coreItems);
  const completenessMissing = Array.from(new Set([...completeness.missingCategories, ...missing]));

  const score = bestOutfit.score || scoreOutfit(coreItems, {
    occasionName: input.occasionName,
    formality: input.formality,
    weatherContext: input.weatherContext,
    seasonContext: input.weatherContext,
    repeatDays,
    allowNeedsCare: input.allowNeedsCare,
    desiredCategories: desiredStructure,
    styleProfile: input.styleProfile,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary,
    allowRecentRepeat,
    recommendationMode
  });

  const confidence = confidenceFromScore(score);


  const chips = buildReasonChips({
    occasionReady: coreItems.length >= 2,

    colorBalanced:
      colorCompatibilityScore(coreItems) >= 13,

    weatherAware: isWeatherAware(
      coreItems,
      input.weatherContext
    ),

    fresh: !coreItems.some(
      (item: any) =>
        item.lastWornAt &&
        (Date.now() -
          new Date(item.lastWornAt).getTime()) /
        86_400_000 <
        repeatDays
    ),

    comfort:
      input.styleDirection === "comfortable" ||
      coreItems.some((item: any) =>
        item.fit?.toLowerCase().includes("comfort")
      ),

    polished: coreItems.some((item: any) =>
      ["shoes", "outerwear", "accessories"].includes(
        item.category
      )
    ),

    eventAware:
      occasionGroup === "event" ||
      occasionGroup === "formal"
  });

  const occasion = input.occasionName || "Today";
  const explanation = buildFashionExplanation({
    items: coreItems,
    occasion,
    occasionGroup,
    weatherContext: input.weatherContext,
    missing: completenessMissing,
    score
  });
  const completenessSummary = completeness.completenessWarnings.length ? ` ${completeness.completenessWarnings.join(" ")}` : "";
  const addLater = completeness.completenessStatus === "missing_footwear"
    ? "Add black shoes, loafers, sneakers, or sandals to complete this look."
    : gapInsights[0]?.message || explanation.addLater;
  const styleProfileNote = input.styleProfile
    ? ` Style preferences considered: ${[
        input.styleProfile.fashionRiskLevel ? `${input.styleProfile.fashionRiskLevel} risk` : "",
        input.styleProfile.comfortPriority ? `${input.styleProfile.comfortPriority} comfort` : "",
        input.styleProfile.favoriteColors?.length ? `colors ${input.styleProfile.favoriteColors.slice(0, 3).join(", ")}` : ""
      ].filter(Boolean).join("; ")}.`
    : "";
  const memoryNote = input.memorySummary?.eventCount
    ? ` Style history considered: recent likes, saves, rejections, and worn items were used gently.`
    : "";
  const novelty = noveltyScore(coreItems, input.outfitHistorySummary);
  const rotationNote = input.outfitHistorySummary?.eventCount
    ? ` Freshness check: ${novelty >= 14 ? "this combination is meaningfully different from recent recommendations" : "this look reuses familiar pieces because they fit the context best"}.`
    : " Freshness check: MyFitPick will start rotating pieces as recommendation history grows.";
  const smallWardrobeNote = readiness.isSmallWardrobe
    ? ` You currently have ${readiness.itemCount} closet item${readiness.itemCount === 1 ? "" : "s"}, so variety may be naturally limited.`
    : "";

  return {
    title: recommendationMode === "todays_best" ? `${occasion} outfit` : `${modeTitle} for ${occasion}`,
    occasion,
    confidence,
    summary: `${explanation.whyItWorks}${completenessSummary}${styleProfileNote}${memoryNote}${rotationNote}${smallWardrobeNote}`,
    items: coreItems,
    reasonChips: [completenessLabel(completeness.completenessStatus), modeTitle, novelty >= 14 ? "Fresh rotation" : "Context led", ...chips].slice(0, 8),
    weatherContext: input.weatherContext || "",
    repetitionNote: freshnessNote(
      coreItems,
      repeatDays
    ),
    careNote: careNote(coreItems),
    colorNote: colorNote(coreItems),
    swapGroups: buildSwapGroups(coreItems, available),
    confidenceScore: boundedConfidenceScore(score),
    ...explanation,
    addLater,
    completenessStatus: completeness.completenessStatus,
    missingCategories: completeness.missingCategories,
    completenessWarnings: completeness.completenessWarnings,
    footwearIncluded: completeness.footwearIncluded,
    recommendationMode,
    styleIntent: modeTitle,
    freshnessCue: novelty >= 14 ? "Fresh compared with recent looks" : input.outfitHistorySummary?.eventCount ? "Familiar pieces used intentionally" : "Rotation starts after more use",
    wardrobeReadiness: readiness,
    gapInsights,
    scoreBreakdown: bestOutfit.scoreBreakdown || {},
    similarityMetadata: bestOutfit.similarityMetadata || {},
    candidateCount: combinations.length,
    diverseCandidateCount: diverseOutfits.length,
    alternatives: diverseOutfits.slice(1).map((outfit) => ({
      title: `${modeTitle} alternative`,
      itemIds: outfit.items.map((item: any) => String(item._id || item.id)),
      similarityMetadata: outfit.similarityMetadata || {}
    }))
  };
}

export function buildSwapGroups(
  selectedItems: any[],
  availableItems: any[]
) {
  return selectedItems.map((item) => ({
    category: item.category,
    itemIds: availableItems
      .filter(
        (candidate) =>
          candidate.category === item.category &&
          String(candidate._id) !== String(item._id)
      )
      .slice(0, 4)
      .map((candidate) => String(candidate._id)),
    warningChips: warningChips(item)
  }));
}

export function warningChips(item: any) {
  const chips: string[] = [];

  if (item.condition === "needs-care")
    chips.push("Needs care");

  if (
    item.lastWornAt &&
    (Date.now() - new Date(item.lastWornAt).getTime()) /
    86_400_000 <
    7
  ) {
    chips.push("Recently worn");
  }

  if (!item.weather?.length)
    chips.push("Lower match");

  return chips;
}

export function serializeOutfit(
  outfit: any,
  items: any[]
) {
  const computedCompleteness = evaluateOutfitCompleteness(items);
  const previewDefaults = {
    status: "not_started",
    provider: "",
    storageKey: "",
    imageUrl: "",
    cacheKey: "",
    promptVersion: "",
    model: "",
    accuracyLevel: {
      id: "inspired_visualization",
      label: "AI Visualization",
      meaning: "Looks inspired by selected items but may not match exact garment fit.",
      rank: 1
    },
    fitWarnings: [],
    groundedItemIds: [],
    missingVisualItemIds: [],
    visualizationWarnings: [],
    footwearIncluded: computedCompleteness.footwearIncluded,
    visualGroundingStatus: "partially_grounded",
    generatedAt: null,
    errorMessage: "",
    attempts: 0
  };
  return {
    id: String(outfit._id),
    title:
      outfit.title ||
      `${outfit.occasion || "Today"} outfit`,
    occasion: outfit.occasion || "",
    confidence: outfit.confidence,
    summary: outfit.summary || "",
    items: items.map(serializeWardrobeItem),
    reasonChips: outfit.reasonChips || [],
    weatherContext: outfit.weatherContext || "",
    weatherFit:
      outfit.weatherContext ||
      "No weather context provided.",
    occasionFit: outfit.occasionFit || "",
    whyItWorks: outfit.whyItWorks || outfit.summary || "",
    materialNote: outfit.materialNote || "",
    silhouetteNote: outfit.silhouetteNote || "",
    improvementNote: outfit.improvementNote || "",
    addLater: outfit.addLater || "",
    confidenceScore: outfit.confidenceScore || 0,
    completenessStatus: outfit.completenessStatus || computedCompleteness.completenessStatus,
    missingCategories: outfit.missingCategories || computedCompleteness.missingCategories,
    completenessWarnings: outfit.completenessWarnings || computedCompleteness.completenessWarnings,
    footwearIncluded: typeof outfit.footwearIncluded === "boolean" ? outfit.footwearIncluded : computedCompleteness.footwearIncluded,
    stylingTips: outfit.stylingTips || [],
    recommendationMode: outfit.recommendationMode || outfit.reasoningMetadata?.recommendationMode || "todays_best",
    styleIntent: outfit.styleIntent || outfit.reasoningMetadata?.styleIntent || "Today's Best Look",
    freshnessCue: outfit.freshnessCue || outfit.reasoningMetadata?.freshnessCue || "Freshness tracked as you use MyFitPick.",
    wardrobeReadiness: outfit.wardrobeReadiness || outfit.reasoningMetadata?.wardrobeReadiness || null,
    gapInsights: outfit.gapInsights || outfit.reasoningMetadata?.gapInsights || [],
    scoreBreakdown: outfit.scoreBreakdown || outfit.reasoningMetadata?.scoreBreakdown || {},
    similarityMetadata: outfit.similarityMetadata || outfit.reasoningMetadata?.similarityMetadata || {},
    candidateCount: outfit.candidateCount || outfit.reasoningMetadata?.candidateCount || 0,
    diverseCandidateCount: outfit.diverseCandidateCount || outfit.reasoningMetadata?.diverseCandidateCount || 0,
    alternatives: outfit.alternatives || outfit.reasoningMetadata?.alternatives || [],
    source: outfit.source || "rule_based",
    preview: { ...previewDefaults, ...(outfit.preview || {}) },
    colorNote:
      outfit.colorNote || colorNote(items),
    repeatNote:
      outfit.repetitionNote ||
      "No recent repeat found.",
    repetitionNote:
      outfit.repetitionNote ||
      "No recent repeat found.",
    careNote:
      outfit.careNote || careNote(items),
    swapGroups:
      outfit.swapGroups ||
      buildSwapGroups(items, items),
    createdAt: outfit.createdAt
      ? new Date(outfit.createdAt).toISOString()
      : undefined
  };
}
