import { colorCompatibilityScore, colorNote } from "@/lib/recommendation/color";
import { isAccessoryCandidate, selectAccessoryCompletion } from "@/lib/recommendation/accessory-completion";
import { validateRecommendationCandidate } from "@/lib/recommendation/candidate-validator";
import { computeRecommendationConfidence } from "@/lib/recommendation/confidence";
import { collectionFamilyFor } from "@/lib/recommendation/collections";
import { evaluateOutfitCompleteness } from "@/lib/recommendation/completeness";
import { diversifyOutfits } from "@/lib/recommendation/diversity";
import { rankCandidatesForEditorialReview } from "@/lib/recommendation/editorial-ranking";
import { buildExplainabilityBreakdown } from "@/lib/recommendation/explainability";
import { fashionKnowledgeScore, marketplaceExtensionPoints } from "@/lib/recommendation/fashion-knowledge";
import { wardrobeGapInsights, wardrobeReadiness } from "@/lib/recommendation/gaps";
import { buildLearningSignals, learningSignalScore } from "@/lib/recommendation/learning-engine";
import { resolveOutfitArchitecture } from "@/lib/recommendation/outfit-architecture";
import { inferOccasionGroup } from "@/lib/recommendation/outfit-structures";
import { categoryToOutfitSlot, normalizeOutfitSlot, outfitSlotsForItem, sanitizeOutfitItems } from "@/lib/recommendation/outfit-slots";
import { personalPreferenceScore } from "@/lib/recommendation/preference-scoring";
import { buildReasonChips } from "@/lib/recommendation/reason-chips";
import { wardrobeRotationScore } from "@/lib/recommendation/rotation";
import { scoreItemForOccasionProfile } from "@/lib/recommendation/occasion-profiles";
import { scoreItemForTemplate } from "@/lib/recommendation/outfit-templates";
import { buildInternalStyleProfile } from "@/lib/recommendation/style-profile";
import {
  fabricCompatibilityScore,
  metadataList,
  metadataValue,
  scoreOutfitDetailed,
  silhouetteBalanceScore
} from "@/lib/recommendation/scoring";
import { scoreCompatibilityGraph } from "@/lib/wardrobe/compatibility/compatibility-graph";
import { referenceItemToPseudoWardrobeItem, serializeReferenceFashionItem } from "@/lib/ai/reference-fashion-item";
import { recommendationEligible, rescueFootwear, taxonomyDiagnostics } from "@/lib/recommendation/engine";
import { buildLimitedWardrobeFallback } from "@/lib/recommendation/limited-wardrobe";
import {
  evaluateRegenerationCandidate,
  logRecommendationDiversity,
  resolveRegenerationPolicy,
  type RecommendationRegenerationContext
} from "@/lib/recommendation/regeneration";
import { resolveExplicitItemExclusions } from "@/lib/recommendation/explicit-exclusions";

type ReferenceMatchInput = {
  referenceItem: any;
  wardrobeItems: any[];
  message?: string;
  occasionName?: string;
  weatherContext?: string;
  weatherAvailability?: "available" | "unavailable" | "not_requested";
  styleProfile?: any;
  memorySummary?: any;
  outfitHistorySummary?: any;
  allowNeedsCare?: boolean;
  recommendationMode?: string;
  regeneration?: RecommendationRegenerationContext;
  compatibilityEdges?: any[];
  limit?: number;
};

type CategoryPlan = {
  required: string[];
  alternatives?: string[][];
  optional: string[];
};

function cleanText(value: unknown, max = 180) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function itemOverlap(left: any[] = [], right: any[] = []) {
  const leftIds = new Set(left.map(itemId).filter(Boolean));
  const rightIds = new Set(right.map(itemId).filter(Boolean));
  const shared = Array.from(leftIds).filter((id) => rightIds.has(id)).length;
  return shared / Math.max(1, leftIds.size, rightIds.size);
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
      return { required: ["tops", "bottoms", "shoes"], alternatives: [["dresses", "shoes"]], optional: ["bags", "accessories"] };
    case "bottoms":
      return { required: ["tops", "shoes"], optional: dressyOptional };
    case "shoes":
      return { required: ["tops", "bottoms"], alternatives: [["dresses"], ["native"]], optional: ["outerwear", "bags", "accessories"] };
    case "dresses":
      return { required: ["shoes"], optional: ["outerwear", "bags", "accessories"] };
    case "bags":
    case "accessories":
      return { required: ["tops", "bottoms", "shoes"], alternatives: [["dresses", "shoes"], ["native", "shoes"]], optional: ["outerwear", anchorCategory === "bags" ? "accessories" : "bags"] };
    default:
      return { required: ["tops", "bottoms", "shoes"], optional: ["outerwear", "bags", "accessories"] };
  }
}

function categoryCandidates(items: any[], category: string, max = 8) {
  const requestedSlot = categoryToOutfitSlot(category);
  return items
    .filter((item) => item.category === category || outfitSlotsForItem(item).includes(requestedSlot))
    .slice(0, max);
}

function optionalCandidates(items: any[], category: string, max = 3) {
  const candidates = categoryCandidates(items, category, max);
  const isFinisher = category === "bags" || category === "accessories";
  if (isFinisher && candidates.length) return candidates;
  return [null, ...candidates];
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
  if (candidate.lastRecommendedAt) {
    const ageDays = (Date.now() - new Date(candidate.lastRecommendedAt).getTime()) / 86_400_000;
    score -= ageDays < 4 ? 18 : ageDays < 14 ? 10 : 2;
  }
  score -= Math.min(12, Number(candidate.recommendationCount || 0) * 2);
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
  // Finishers are selected after core diversification. Including bags and
  // accessories in this Cartesian product made distinct core looks converge
  // on the same early-ranked finishing items and exhausted the candidate cap.
  const optionalGroups = input.plan.optional.filter((category) => category === "outerwear").map((category) => ({
    category,
    items: optionalCandidates(sorted, category, 6)
  }));

  const outfits: any[] = [];
  const learningSignals = input.scoringInput.learningSignals || buildLearningSignals({
    items: input.scoringInput.wardrobeItems || [],
    memorySummary: input.scoringInput.memorySummary,
    outfitHistorySummary: input.scoringInput.outfitHistorySummary
  });

  function walkRequired(requiredGroups: Array<{ category: string; items: any[] }>, index: number, selected: any[]) {
    if (index >= requiredGroups.length) {
      walkOptional(0, selected);
      return;
    }

    const group = requiredGroups[index];
    if (!group.items.length) {
      return;
    }

    for (const item of group.items) {
      walkRequired(requiredGroups, index + 1, [...selected, item]);
    }
  }

  function walkOptional(index: number, selected: any[]) {
    if (outfits.length >= 360) return;
    if (index >= optionalGroups.length) {
      const unique = sanitizeOutfitItems(selected.filter(Boolean)).items;
      if (!unique.length) return;
      const withAnchor = [input.anchor, ...unique];
      const detailed = scoreOutfitDetailed(withAnchor, input.scoringInput);
      const score = detailed.total + colorCompatibilityScore(withAnchor) + fabricCompatibilityScore(withAnchor) + silhouetteBalanceScore(withAnchor);
      const architectureScore = unique.reduce((sum, item) => {
        return sum +
          scoreItemForTemplate(item, input.scoringInput.outfitTemplate) +
          (input.scoringInput.occasionProfile ? scoreItemForOccasionProfile(item, input.scoringInput.occasionProfile) : 0);
      }, 0);
      const personalScore = personalPreferenceScore(unique, input.scoringInput);
      const learningScore = learningSignalScore(unique, learningSignals);
      const rotationScore = wardrobeRotationScore(unique, input.scoringInput.outfitHistorySummary);
      const knowledgeScore = fashionKnowledgeScore(withAnchor, input.scoringInput);
      const graphScore = scoreCompatibilityGraph(unique, input.scoringInput.compatibilityEdges || []);
      outfits.push({
        items: unique,
        itemsWithAnchor: withAnchor,
        score: Math.round((score + architectureScore + personalScore + learningScore + rotationScore + knowledgeScore + graphScore.score) * 10) / 10,
        scoreBreakdown: {
          ...detailed.breakdown,
          personalPreference: personalScore,
          learningSignals: learningScore,
          wardrobeRotation: rotationScore,
          fashionKnowledge: knowledgeScore,
          compatibilityGraph: graphScore
        },
        itemSignature: unique.map(itemId).filter(Boolean).sort().join("|")
      });
      return;
    }

    for (const item of optionalGroups[index].items) {
      walkOptional(index + 1, item ? [...selected, item] : selected);
    }
  }

  const requiredPlans = [input.plan.required, ...(input.plan.alternatives || [])];
  for (const requiredPlan of requiredPlans) {
    const requiredGroups = requiredPlan.map((category) => ({
      category,
      items: categoryCandidates(sorted, category, 8)
    }));
    walkRequired(requiredGroups, 0, []);
  }
  if (!outfits.length && sorted.length) {
    const fallback = sanitizeOutfitItems(sorted.slice(0, 4)).items;
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
  const explicitExclusions = resolveExplicitItemExclusions(input.message, input.wardrobeItems);
  const explicitlyExcludedIds = new Set(explicitExclusions.excludedItemIds);
  const available = input.wardrobeItems.filter((item) => {
    if (item.archivedAt) return false;
    if (explicitlyExcludedIds.has(itemId(item))) return false;
    if (!recommendationEligible(item)) return false;
    if (item.condition === "needs-care" && !input.allowNeedsCare) return false;
    return true;
  });
  const plan = categoryPlanFor(referenceItem.category || "", occasion);
  const architecture = resolveOutfitArchitecture({
    occasionName: occasion,
    weatherContext: input.weatherContext,
    recommendationMode: input.recommendationMode || "photo_match",
    styleProfile: input.styleProfile
  });
  const { occasionProfile, outfitTemplate } = architecture;
  const internalStyleProfile = buildInternalStyleProfile({
    styleProfile: input.styleProfile,
    wardrobeItems: available,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary
  });
  const learningSignals = buildLearningSignals({
    items: available,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary
  });
  const scoringInput = {
    occasionName: occasion,
    weatherContext: input.weatherContext,
    seasonContext: input.weatherContext,
    repeatDays: 14,
    allowNeedsCare: input.allowNeedsCare,
    desiredCategories: [anchor.category, ...plan.required],
    styleProfile: internalStyleProfile,
    memorySummary: input.memorySummary,
    outfitHistorySummary: input.outfitHistorySummary,
    allowRecentRepeat: /repeat|again|same look|rewear/i.test(occasion),
    recommendationMode: input.recommendationMode || "photo_match",
    occasionProfile,
    outfitTemplate,
    wardrobeItems: available,
    compatibilityEdges: input.compatibilityEdges || [],
    learningSignals
  };
  const combinations = makeCombinations({
    anchor,
    wardrobeItems: available,
    plan,
    occasionName: occasion,
    weatherContext: input.weatherContext,
    scoringInput
  });
  const validatedCombinations = combinations.map((candidate) => ({
    ...candidate,
    stylingValidation: validateRecommendationCandidate({
      items: candidate.itemsWithAnchor,
      template: outfitTemplate,
      profile: occasionProfile,
      weatherContext: input.weatherContext,
      allowIncomplete: false
    })
  }));
  const validCombinations = validatedCombinations.filter((candidate) => candidate.stylingValidation.valid);
  const rankedCombinations = rankCandidatesForEditorialReview(
    validCombinations,
    {
      template: outfitTemplate,
      profile: occasionProfile,
      styleProfile: internalStyleProfile,
      limit: 80
    }
  );
  const regenerationPolicy = resolveRegenerationPolicy(input.regeneration, available, {
    allowedStructures: outfitTemplate.validStructures
  });
  const lockedFinisherItems = available.filter((item) =>
    regenerationPolicy.lockedItemIds.includes(itemId(item)) && isAccessoryCandidate(item)
  );
  const regenerationEligibleCombinations = regenerationPolicy.enabled
    ? rankedCombinations.filter((candidate) => evaluateRegenerationCandidate([...candidate.items, ...lockedFinisherItems], regenerationPolicy).valid)
    : rankedCombinations;
  const selectionCandidates = regenerationEligibleCombinations.length ? regenerationEligibleCombinations : rankedCombinations;
  const diverse = diversifyOutfits(selectionCandidates, {
    limit: Math.min(8, Math.max((input.limit || 3) * 2, 6)),
    historySummary: input.outfitHistorySummary,
    diversityWeight: 0.58,
    avoidLastOutfit: regenerationPolicy.enabled,
    maximumLastOutfitOverlap: regenerationPolicy.enabled ? regenerationPolicy.maximumOverlap : 0.5,
    maximumSelectedOverlap: 0.52
  });
  const selected = diverse;
  const readiness = wardrobeReadiness(available);
  const gapInsights = wardrobeGapInsights(available, occasion);

  if (!selected.length) {
    const { occasion: _fallbackOccasion, ...fallback } = buildLimitedWardrobeFallback({ items: [anchor, ...available], missingRoles: plan.required, occasion });
    return [{
      title: `Match for ${displayReferenceLabel(referenceItem)}`,
      occasion,
      confidence: "Needs review",
      summary: "I could not find enough saved closet items to build around this photo yet.",
      items: [],
      reasonChips: ["Photo anchor", "Closet limited"],
      weatherContext: input.weatherContext || "",
      weatherAvailability: input.weatherAvailability || (input.weatherContext ? "available" : "not_requested"),
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
      recommendationMode: input.recommendationMode || "photo_match",
      styleIntent: regenerationPolicy.enabled ? "Something Different" : "Photo Match",
      freshnessCue: regenerationPolicy.enabled
        ? "A different photo-led match needs more compatible closet choices."
        : "Freshness starts after more photo matches are generated.",
      wardrobeReadiness: readiness,
      gapInsights,
      scoreBreakdown: {
        outfitTemplate: { id: outfitTemplate.id, label: outfitTemplate.label },
        occasionProfile: { id: occasionProfile.id, label: occasionProfile.label }
      },
      similarityMetadata: {
        referenceItemId: String(referenceItem._id),
        source: "reference-upload",
        outfitStructure: outfitTemplate.stylingFamily,
        outfitTemplateId: outfitTemplate.id,
        occasionProfileId: occasionProfile.id
      },
      candidateCount: combinations.length,
      diverseCandidateCount: selected.length,
      alternatives: [],
      outfitPieces: outfitPieces(referenceItem, []),
      referenceItems: [serializeReferenceFashionItem(referenceItem)],
      ...fallback
    }];
  }

  const completedRecommendations: any[] = [];
  const usedFinisherIds = new Set<string>();
  const targetCount = Math.max(1, Math.min(input.limit || 3, 3));
  const allowRegenerationFallback = regenerationPolicy.enabled && regenerationEligibleCombinations.length === 0;

  for (const candidate of selected) {
    if (completedRecommendations.length >= targetCount) break;
    const index = completedRecommendations.length;
    const candidateItems = sanitizeOutfitItems(candidate.items || []).items;
    const coreOnlyItems = candidateItems.filter((item) => !isAccessoryCandidate(item));
    const coreItems = coreOnlyItems.length ? coreOnlyItems : candidateItems;
    const anchorSuppliesFootwear = normalizeOutfitSlot(anchor) === "shoes";
    const footwearRescue = anchorSuppliesFootwear
      ? { items: coreItems, state: "footwear_selected" as const, rescued: false, candidateCount: 0, diagnostics: [] }
      : rescueFootwear(coreItems, available, scoringInput);
    const accessoryCompletion = selectAccessoryCompletion({
      // Include the temporary anchor for role locking only. The provider returns
      // newly selected closet accessories, so the anchor is never persisted.
      selectedItems: [anchor, ...footwearRescue.items, ...lockedFinisherItems],
      wardrobeItems: available,
      occasionName: occasion,
      weatherContext: input.weatherContext,
      repeatDays: 14,
      allowNeedsCare: input.allowNeedsCare,
      allowRecentRepeat: /repeat|again|same look|rewear/i.test(occasion),
      styleProfile: input.styleProfile,
      memorySummary: input.memorySummary,
      outfitHistorySummary: input.outfitHistorySummary,
      excludedItemIds: Array.from(new Set([
        ...(regenerationPolicy.enabled
          ? regenerationPolicy.previousFinisherItemIds.filter((id) => !regenerationPolicy.lockedItemIds.includes(id))
          : []),
        ...Array.from(usedFinisherIds)
      ])),
      emitMetrics: completedRecommendations.length === 0
    });
    const completedItems = sanitizeOutfitItems([...footwearRescue.items, ...lockedFinisherItems, ...accessoryCompletion.items]).items;
    const regenerationEvaluation = evaluateRegenerationCandidate(completedItems, regenerationPolicy);
    if (regenerationPolicy.enabled && !regenerationEvaluation.valid && !allowRegenerationFallback) continue;
    if (completedRecommendations.some((recommendation) => itemOverlap(completedItems, recommendation.items) > 0.5)) continue;
    const completedItemsWithAnchor = [anchor, ...completedItems];
    const completeness = evaluateOutfitCompleteness(completedItemsWithAnchor, { allowedStructures: outfitTemplate.validStructures, footwearState: footwearRescue.state });
    const finalValidation = validateRecommendationCandidate({
      items: completedItemsWithAnchor,
      template: outfitTemplate,
      profile: occasionProfile,
      weatherContext: input.weatherContext,
      allowIncomplete: false
    });
    const missing = completeness.missingCategories;
    const notes = explanation({ referenceItem, items: completedItems, itemsWithAnchor: completedItemsWithAnchor, occasion, missingCategories: missing });
    const preferenceScore = personalPreferenceScore(completedItems, {
      styleProfile: internalStyleProfile,
      memorySummary: input.memorySummary,
      outfitHistorySummary: input.outfitHistorySummary
    });
    const rotationIntelligenceScore = wardrobeRotationScore(completedItems, input.outfitHistorySummary);
    const knowledgeScore = fashionKnowledgeScore(completedItemsWithAnchor, {
      occasionName: occasion,
      weatherContext: input.weatherContext,
      occasionProfile
    });
    const confidenceEngine = computeRecommendationConfidence({
      score: candidate.score,
      candidateCount: combinations.length,
      validation: finalValidation,
      wardrobeReadiness: readiness,
      completenessStatus: completeness.completenessStatus,
      weatherContext: input.weatherContext
    });
    const collectionFamily = collectionFamilyFor({
      occasionName: occasion,
      recommendationMode: input.recommendationMode || "photo_match",
      outfitTemplateId: outfitTemplate.id
    });
    const chips = buildReasonChips({
      occasionReady: completedItems.length >= 2,
      colorBalanced: colorCompatibilityScore(completedItemsWithAnchor) >= 13,
      weatherAware: Boolean(input.weatherContext),
      fresh: true,
      comfort: completedItemsWithAnchor.some((item: any) => /comfort|soft|relaxed/i.test(`${item.fit || ""} ${metadataValue(item, "fabricEstimate") || ""}`)),
      polished: completedItemsWithAnchor.some((item: any) => ["shoes", "outerwear", "accessories", "bags"].includes(item.category)),
      eventAware: /wedding|dinner|formal|church|event/i.test(occasion)
    });
    const fullLimitedFallback = completeness.completenessStatus === "complete"
      ? null
      : buildLimitedWardrobeFallback({ items: completedItemsWithAnchor, missingRoles: missing, occasion });
    const limitedFallback = fullLimitedFallback ? (({ occasion: _occasion, ...rest }) => rest)(fullLimitedFallback) : {};

    completedRecommendations.push({
      title: index === 0 ? `${displayReferenceLabel(referenceItem)} outfit` : `${displayReferenceLabel(referenceItem)} option ${index + 1}`,
      occasion,
      confidence: confidenceFromScore(candidate.score),
      summary: `${notes.whyItWorks}${missing.length ? ` Missing ${missing.join(", ")} keeps it from being fully complete.` : ""}`,
      items: completedItems,
      reasonChips: ["Photo anchor", ...chips].slice(0, 8),
      weatherContext: input.weatherContext || "",
      weatherAvailability: input.weatherAvailability || (input.weatherContext ? "available" : "not_requested"),
      repetitionNote: "Photo matches are rotated as you keep styling.",
      careNote: completedItems.some((item: any) => item.condition === "needs-care") ? "One closet item may need care before wearing." : "Selected closet items are marked ready.",
      colorNote: colorNote(completedItemsWithAnchor),
      ...notes,
      stylingTips: [
        accessoryCompletion.decision.status === "included" ? accessoryCompletion.decision.reason : "",
        ...(notes.stylingTips || [])
      ].filter(Boolean),
      addLater: missing.length ? `Optional add later: ${missing[0]}.` : "",
      confidenceScore: Math.max(boundedConfidence(candidate.score), confidenceEngine.overallConfidence / 100),
      completenessStatus: completeness.completenessStatus,
      missingCategories: missing,
      completenessWarnings: [
        ...completeness.completenessWarnings,
        ...(regenerationPolicy.enabled && !regenerationEvaluation.valid
          ? ["A fully different complete match was not available, so the closest safe alternative was used."]
          : [])
      ],
      footwearIncluded: completeness.footwearIncluded,
      recommendationMode: input.recommendationMode || "photo_match",
      styleIntent: regenerationPolicy.enabled ? "Something Different" : "Photo Match",
      freshnessCue: regenerationPolicy.enabled
        ? "Rebuilt with enforced closet-item changes."
        : "Built as a fresh photo-led closet match.",
      wardrobeReadiness: readiness,
      gapInsights,
      ...limitedFallback,
      scoreBreakdown: {
        ...(candidate.scoreBreakdown || {}),
        accessoryCompletion: accessoryCompletion.decision,
        footwearCompletion: {
          rescued: footwearRescue.rescued,
          candidateCount: footwearRescue.candidateCount,
          status: footwearRescue.state,
          diagnostics: footwearRescue.diagnostics
        },
        taxonomyDiagnostics: taxonomyDiagnostics(available, completedItems),
        outfitTemplate: { id: outfitTemplate.id, label: outfitTemplate.label, stylingFamily: outfitTemplate.stylingFamily },
        occasionProfile: { id: occasionProfile.id, label: occasionProfile.label },
        stylingValidation: finalValidation,
        personalPreference: preferenceScore,
        learningSignals: learningSignalScore(completedItems, learningSignals),
        wardrobeRotation: rotationIntelligenceScore,
        fashionKnowledge: knowledgeScore,
        confidenceEngine,
        explainability: buildExplainabilityBreakdown({
          scoreBreakdown: candidate.scoreBreakdown || {},
          confidence: confidenceEngine,
          validation: finalValidation,
          rotationScore: rotationIntelligenceScore,
          personalPreferenceScore: preferenceScore,
          fashionKnowledgeScore: knowledgeScore
        }),
        marketplaceExtensionPoints: marketplaceExtensionPoints(completedItems, { missingCategories: missing }),
        collectionFamily
      },
      similarityMetadata: {
        ...(candidate.similarityMetadata || {}),
        referenceItemId: String(referenceItem._id),
        source: "reference-upload",
        anchorCategory: referenceItem.category || "",
        itemSignature: completedItems.map(itemId).filter(Boolean).sort().join("|"),
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
        },
        regeneration: regenerationEvaluation,
        completedOutfitMaximumPeerOverlap: completedRecommendations.length
          ? Math.max(...completedRecommendations.map((recommendation) => itemOverlap(completedItems, recommendation.items)))
          : 0
      },
      candidateCount: combinations.length,
      diverseCandidateCount: selected.length,
      alternatives: selected.slice(1).map((alternative) => ({
        title: `${displayReferenceLabel(referenceItem)} alternative`,
        itemIds: alternative.items.map(itemId),
        similarityMetadata: { referenceItemId: String(referenceItem._id), source: "reference-upload" }
      })),
      outfitPieces: outfitPieces(referenceItem, completedItems),
      referenceItems: [serializeReferenceFashionItem(referenceItem)]
    });
    for (const item of completedItems.filter(isAccessoryCandidate)) usedFinisherIds.add(itemId(item));
  }

  const primaryRegenerationEvaluation = completedRecommendations[0]?.similarityMetadata?.regeneration;
  logRecommendationDiversity({
    flow: "match",
    policy: regenerationPolicy,
    evaluation: primaryRegenerationEvaluation,
    candidateCount: rankedCombinations.length,
    eligibleCandidateCount: regenerationEligibleCombinations.length,
    status: !regenerationPolicy.enabled
      ? "not_requested"
      : primaryRegenerationEvaluation?.valid
        ? "satisfied"
        : "fallback"
  });

  return completedRecommendations;
}
