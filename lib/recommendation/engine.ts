import { colorCompatibilityScore, colorNote } from "@/lib/recommendation/color";
import { isAccessoryCandidate, selectAccessoryCompletion } from "@/lib/recommendation/accessory-completion";
import { completenessLabel, evaluateOutfitCompleteness } from "@/lib/recommendation/completeness";
import { completeFootwear } from "@/lib/recommendation/footwear-completion";
import { computeRecommendationConfidence } from "@/lib/recommendation/confidence";
import { collectionFamilyFor } from "@/lib/recommendation/collections";
import { diversifyOutfits, noveltyScore } from "@/lib/recommendation/diversity";
import { rankCandidatesForEditorialReview } from "@/lib/recommendation/editorial-ranking";
import { buildExplainabilityBreakdown } from "@/lib/recommendation/explainability";
import { fashionKnowledgeScore, marketplaceExtensionPoints } from "@/lib/recommendation/fashion-knowledge";
import { wardrobeGapInsights, wardrobeReadiness } from "@/lib/recommendation/gaps";
import { buildLearningSignals, learningSignalScore } from "@/lib/recommendation/learning-engine";
import { resolveOutfitArchitecture } from "@/lib/recommendation/outfit-architecture";
import { missingCoreCategories } from "@/lib/recommendation/outfit-structures";
import { modeLabel, normalizeRecommendationMode } from "@/lib/recommendation/policy";
import { personalPreferenceScore } from "@/lib/recommendation/preference-scoring";
import { buildReasonChips } from "@/lib/recommendation/reason-chips";
import { wardrobeRotationScore } from "@/lib/recommendation/rotation";
import { outfitSlotsForItem, sanitizeOutfitItems } from "@/lib/recommendation/outfit-slots";
import { resolveCanonicalTaxonomy } from "@/lib/wardrobe/canonical-taxonomy";
import { logTaxonomyMetric } from "@/lib/wardrobe/taxonomy-observability";
import { buildInternalStyleProfile } from "@/lib/recommendation/style-profile";
import { validateRecommendationCandidate } from "@/lib/recommendation/candidate-validator";
import {
  metadataList,
  metadataValue,
  scoreOutfit
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

export function recommendationEligible(item: any) {
  const taxonomy = resolveCanonicalTaxonomy(item);
  if (taxonomy.structureRole === "hair_piece" || taxonomy.visibilityRole === "appearance_item") return false;
  if (["small_leather_good", "travel_luggage", "not_outfit_visible"].includes(taxonomy.visibilityRole)) return false;
  return true;
}

export function rescueFootwear(items: any[], wardrobeItems: any[], scoringInput: any) {
  const result = completeFootwear({
    selectedItems: items,
    allWardrobeItems: wardrobeItems.filter(recommendationEligible),
    occasion: scoringInput?.occasionName,
    formality: scoringInput?.formality,
    weather: scoringInput?.weatherContext,
    stylePreferences: scoringInput?.styleProfile,
    recentWearHistory: scoringInput?.outfitHistorySummary,
    allowNeedsCare: scoringInput?.allowNeedsCare,
    scoringInput
  });
  if (result.state !== "footwear_selected") logTaxonomyMetric("recommendation.footwear.initially_missing", { ownedCandidateCount: result.candidateCount });
  if (result.state === "footwear_rescued") logTaxonomyMetric("recommendation.footwear.rescued", { ownedCandidateCount: result.candidateCount });
  if (result.state === "footwear_rescued") logTaxonomyMetric("recommendation.footwear.selected_by_rescue", { ownedCandidateCount: result.candidateCount });
  logTaxonomyMetric("recommendation.footwear.rejected_weather", { rejectedCount: result.diagnostics.filter((entry) => entry.rejectionCode === "weather_conflict").length });
  logTaxonomyMetric("recommendation.footwear.rejected_formality", { rejectedCount: result.diagnostics.filter((entry) => entry.rejectionCode === "formality_conflict").length });
  if (result.state === "no_owned_footwear") logTaxonomyMetric("recommendation.footwear.no_owned_item", { ownedCandidateCount: 0 });
  if (result.state === "footwear_available_but_incompatible") logTaxonomyMetric("recommendation.footwear.available_but_incompatible", { ownedCandidateCount: result.candidateCount });
  return result;
}

export function taxonomyDiagnostics(wardrobeItems: any[], selectedItems: any[]) {
  const selectedIds = new Set(selectedItems.map((item) => String(item?._id || item?.id || "")));
  return wardrobeItems.map((item) => {
    const itemId = String(item?._id || item?.id || "");
    const taxonomy = resolveCanonicalTaxonomy(item);
    const selected = selectedIds.has(itemId);
    let omissionReason = selected ? "" : "lower_ranked_compatible_item";
    if (!selected && taxonomy.needsReview) omissionReason = taxonomy.structureRole === "set" ? "set_components_unconfirmed" : "taxonomy_needs_review";
    else if (!selected && taxonomy.visibilityRole !== "primary_carry" && taxonomy.structureRole === "carry") omissionReason = "not_primary_carry";
    else if (!selected && taxonomy.structureRole === "hair_piece") omissionReason = "not_requested";
    return {
      itemId,
      canonicalSubtype: taxonomy.canonicalSubtype,
      structureRole: taxonomy.structureRole,
      stylingRole: taxonomy.stylingRole,
      visibilityRole: taxonomy.visibilityRole,
      taxonomySource: taxonomy.source,
      taxonomyConfidence: taxonomy.confidence,
      eligiblePools: outfitSlotsForItem(item),
      selected,
      omissionReason
    };
  }).slice(0, 500);
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
      ? `Material read: ${fabrics.slice(0, 3).join(", ")}. These textures work together for the occasion.`
      : "Fabric detail is limited, so MyFitPick matched the look by category, color, and occasion.",
    silhouetteNote: silhouettes.length
      ? `Silhouette read: ${silhouettes.slice(0, 3).join(", ")}. The proportions are kept balanced and wearable.`
      : "Fit detail is limited, so MyFitPick keeps the proportions balanced without overclaiming exact fit.",
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
  compatibilityEdges?: any[];
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

  const architecture = resolveOutfitArchitecture({
    occasionName: input.occasionName,
    occasionGroup: input.occasionGroup,
    weatherContext: input.weatherContext,
    recommendationMode,
    styleProfile: input.styleProfile
  });
  const { occasionGroup, occasionProfile, outfitTemplate, desiredStructure } = architecture;

  const available = input.wardrobeItems.filter((item) => {
    if (item.archivedAt) return false;
    if (!recommendationEligible(item)) return false;

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
  const internalStyleProfile = buildInternalStyleProfile({
    styleProfile: input.styleProfile,
    wardrobeItems: readyFirst,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary
  });
  const learningSignals = buildLearningSignals({
    items: readyFirst,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary
  });

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
      styleProfile: internalStyleProfile,
      memorySummary: input.memorySummary,
      outfitHistorySummary: input.outfitHistorySummary,
      allowRecentRepeat,
      previousLooks: input.previousLooks || [],
      recommendationMode,
      occasionProfile,
      outfitTemplate,
      wardrobeItems: readyFirst,
      compatibilityEdges: input.compatibilityEdges || [],
      weather: input.weather,
      preferences: input.preferences,
      maxCandidates: 650
    }
  );

  const validatedCombinations = combinations.map((candidate) => ({
    ...candidate,
    stylingValidation: validateRecommendationCandidate({
      items: candidate.items,
      template: outfitTemplate,
      profile: occasionProfile,
      allowIncomplete: readiness.isSmallWardrobe
    })
  }));
  const validCombinations = validatedCombinations.filter((candidate) => candidate.stylingValidation.valid);
  const rankedCombinations = rankCandidatesForEditorialReview(
    validCombinations.length ? validCombinations : validatedCombinations,
    {
      template: outfitTemplate,
      profile: occasionProfile,
      styleProfile: internalStyleProfile,
      limit: 80
    }
  );

  const diverseOutfits = diversifyOutfits(rankedCombinations, {
    limit: 3,
    historySummary: input.outfitHistorySummary,
    diversityWeight: recommendationMode === "todays_best" ? 0.34 : 0.5
  });

  const bestOutfit = diverseOutfits[0] || rankedCombinations[0] || combinations[0];

  const outfitSanitization = sanitizeOutfitItems(bestOutfit?.items || []);
  const sanitizedItems: any[] = outfitSanitization.items;
  const coreOnlyItems = sanitizedItems.filter((item) => !isAccessoryCandidate(item));
  const coreItems: any[] = coreOnlyItems.length ? coreOnlyItems : sanitizedItems;

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
      scoreBreakdown: {
        outfitTemplate: { id: outfitTemplate.id, label: outfitTemplate.label },
        occasionProfile: { id: occasionProfile.id, label: occasionProfile.label }
      },
      similarityMetadata: {
        outfitStructure: outfitTemplate.stylingFamily,
        outfitTemplateId: outfitTemplate.id,
        occasionProfileId: occasionProfile.id
      },
      alternatives: []
    };
  }

  const footwearRescue = rescueFootwear(coreItems, readyFirst, {
    occasionName: input.occasionName,
    formality: input.formality,
    weatherContext: input.weatherContext,
    seasonContext: input.weatherContext,
    repeatDays,
    allowNeedsCare: input.allowNeedsCare,
    desiredCategories: desiredStructure,
    styleProfile: internalStyleProfile,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary,
    allowRecentRepeat,
    recommendationMode,
    compatibilityEdges: input.compatibilityEdges || []
  });
  const accessoryCompletion = selectAccessoryCompletion({
    selectedItems: footwearRescue.items,
    wardrobeItems: readyFirst,
    occasionName: input.occasionName,
    formality: input.formality,
    weatherContext: input.weatherContext,
    repeatDays,
    allowNeedsCare: input.allowNeedsCare,
    allowRecentRepeat,
    styleProfile: internalStyleProfile,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary
  });
  const completedItems = sanitizeOutfitItems([...footwearRescue.items, ...accessoryCompletion.items]).items;
  const itemTaxonomyDiagnostics = taxonomyDiagnostics(readyFirst, completedItems);
  logTaxonomyMetric("recommendation.item.omitted_by_role", {
    consideredCount: itemTaxonomyDiagnostics.length,
    selectedCount: itemTaxonomyDiagnostics.filter((entry) => entry.selected).length,
    taxonomyReviewCount: itemTaxonomyDiagnostics.filter((entry) => entry.omissionReason === "taxonomy_needs_review").length,
    notPrimaryCarryCount: itemTaxonomyDiagnostics.filter((entry) => entry.omissionReason === "not_primary_carry").length
  });
  logTaxonomyMetric("recommendation.readiness.role_coverage", {
    finishingRoleCount: Object.keys(readiness.finishingRoleCoverage || {}).length,
    footwearVariety: readiness.footwearVariety,
    taxonomyReviewCount: readiness.taxonomyReviewCount || 0
  });
  const completeness = evaluateOutfitCompleteness(completedItems, { allowedStructures: outfitTemplate.validStructures, footwearState: footwearRescue.state });
  logTaxonomyMetric(completeness.satisfiedStructure ? "recommendation.structure.selected" : "recommendation.structure.incomplete", {
    structure: completeness.satisfiedStructure || "none",
    evaluatedStructureCount: completeness.evaluatedStructures.length
  });
  const finalValidation = validateRecommendationCandidate({
    items: completedItems,
    template: outfitTemplate,
    profile: occasionProfile,
    allowIncomplete: readiness.isSmallWardrobe
  });
  const completenessMissing = Array.from(new Set([...completeness.missingCategories, ...missing]));

  const score = scoreOutfit(completedItems, {
    occasionName: input.occasionName,
    formality: input.formality,
    weatherContext: input.weatherContext,
    seasonContext: input.weatherContext,
    repeatDays,
    allowNeedsCare: input.allowNeedsCare,
    desiredCategories: desiredStructure,
    styleProfile: internalStyleProfile,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary,
    allowRecentRepeat,
    recommendationMode,
    compatibilityEdges: input.compatibilityEdges || []
  }) +
    personalPreferenceScore(completedItems, {
      styleProfile: internalStyleProfile,
      memorySummary: input.memorySummary,
      outfitHistorySummary: input.outfitHistorySummary
    }) +
    learningSignalScore(completedItems, learningSignals) +
    wardrobeRotationScore(completedItems, input.outfitHistorySummary) +
    fashionKnowledgeScore(completedItems, {
      occasionName: input.occasionName,
      weatherContext: input.weatherContext,
      occasionProfile
    });
  const confidenceEngine = computeRecommendationConfidence({
    score,
    candidateCount: combinations.length,
    validation: finalValidation,
    wardrobeReadiness: readiness,
    completenessStatus: completeness.completenessStatus,
    weatherContext: input.weatherContext
  });
  const collectionFamily = collectionFamilyFor({
    occasionName: input.occasionName,
    recommendationMode,
    outfitTemplateId: outfitTemplate.id
  });
  const preferenceScore = personalPreferenceScore(completedItems, {
    styleProfile: internalStyleProfile,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary
  });
  const rotationIntelligenceScore = wardrobeRotationScore(completedItems, input.outfitHistorySummary);
  const knowledgeScore = fashionKnowledgeScore(completedItems, {
    occasionName: input.occasionName,
    weatherContext: input.weatherContext,
    occasionProfile
  });

  const confidence = confidenceFromScore(score);


  const chips = buildReasonChips({
    occasionReady: completedItems.length >= 2,

    colorBalanced:
      colorCompatibilityScore(completedItems) >= 13,

    weatherAware: isWeatherAware(
      completedItems,
      input.weatherContext
    ),

    fresh: !completedItems.some(
      (item: any) =>
        item.lastWornAt &&
        (Date.now() -
          new Date(item.lastWornAt).getTime()) /
        86_400_000 <
        repeatDays
    ),

    comfort:
      input.styleDirection === "comfortable" ||
      completedItems.some((item: any) =>
        item.fit?.toLowerCase().includes("comfort")
      ),

    polished: completedItems.some((item: any) =>
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
    items: completedItems,
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
  const novelty = noveltyScore(completedItems, input.outfitHistorySummary);
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
    items: completedItems,
    reasonChips: [completenessLabel(completeness.completenessStatus), modeTitle, novelty >= 14 ? "Fresh rotation" : "Context led", ...chips].slice(0, 8),
    weatherContext: input.weatherContext || "",
    repetitionNote: freshnessNote(
      completedItems,
      repeatDays
    ),
    careNote: careNote(completedItems),
    colorNote: colorNote(completedItems),
    swapGroups: buildSwapGroups(completedItems, available),
    confidenceScore: Math.max(boundedConfidenceScore(score), confidenceEngine.overallConfidence / 100),
    ...explanation,
    stylingTips: [
      accessoryCompletion.decision.status === "included" ? accessoryCompletion.decision.reason : "",
      ...(explanation.stylingTips || [])
    ].filter(Boolean),
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
    scoreBreakdown: {
      ...(bestOutfit.scoreBreakdown || {}),
      accessoryCompletion: accessoryCompletion.decision,
      footwearCompletion: {
        rescued: footwearRescue.rescued,
        candidateCount: footwearRescue.candidateCount,
        status: footwearRescue.state,
        diagnostics: footwearRescue.diagnostics
      },
      taxonomyDiagnostics: itemTaxonomyDiagnostics,
      outfitTemplate: { id: outfitTemplate.id, label: outfitTemplate.label, stylingFamily: outfitTemplate.stylingFamily },
      occasionProfile: { id: occasionProfile.id, label: occasionProfile.label },
      stylingValidation: finalValidation,
      personalPreference: preferenceScore,
      learningSignals: learningSignalScore(completedItems, learningSignals),
      wardrobeRotation: rotationIntelligenceScore,
      fashionKnowledge: knowledgeScore,
      confidenceEngine,
      explainability: buildExplainabilityBreakdown({
        scoreBreakdown: bestOutfit.scoreBreakdown || {},
        confidence: confidenceEngine,
        validation: finalValidation,
        rotationScore: rotationIntelligenceScore,
        personalPreferenceScore: preferenceScore,
        fashionKnowledgeScore: knowledgeScore
      }),
      marketplaceExtensionPoints: marketplaceExtensionPoints(completedItems, { missingCategories: completenessMissing }),
      collectionFamily
    },
    similarityMetadata: {
      ...(bestOutfit.similarityMetadata || {}),
      accessoryDecision: accessoryCompletion.decision,
      outfitStructure: outfitTemplate.stylingFamily,
      outfitTemplateId: outfitTemplate.id,
      occasionProfileId: occasionProfile.id,
      collectionFamily,
      personalStyleProfile: {
        inferredFrom: internalStyleProfile.inferredFrom || [],
        learningWeight: learningSignals.recentWeight
      },
      stylingValidation: {
        valid: finalValidation.valid,
        warnings: finalValidation.warnings,
        rejectReason: finalValidation.rejectReason,
        structure: finalValidation.structure
      }
    },
    candidateCount: combinations.length,
    diverseCandidateCount: diverseOutfits.length,
    alternatives: diverseOutfits.slice(1).map((outfit) => ({
      title: `${modeTitle} alternative`,
      itemIds: sanitizeOutfitItems(outfit.items).items.map((item: any) => String(item._id || item.id)),
      similarityMetadata: {
        ...(outfit.similarityMetadata || {}),
        outfitStructure: outfitTemplate.stylingFamily,
        outfitTemplateId: outfitTemplate.id,
        occasionProfileId: occasionProfile.id
      }
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
      meaning: "Preview inspired by selected items but may not match exact garment fit.",
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
    outfitPieces: outfit.outfitPieces || outfit.reasoningMetadata?.outfitPieces || [],
    referenceItems: outfit.referenceItems || outfit.reasoningMetadata?.referenceItems || [],
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
    savedAt: outfit.savedAt
      ? new Date(outfit.savedAt).toISOString()
      : null,
    favorite: Boolean(outfit.favorite),
    createdAt: outfit.createdAt
      ? new Date(outfit.createdAt).toISOString()
      : undefined
  };
}
