import { normalizeOutfitSlot, outfitSlotsForItem } from "@/lib/recommendation/outfit-slots";
import { evaluateOutfitCompleteness } from "@/lib/recommendation/completeness";
import { type OutfitStructure } from "@/lib/recommendation/outfit-templates";

export type RecommendationRegenerationContext = {
  requestKind?: "initial" | "regenerate" | "anchor";
  previousRecommendationId?: string | null;
  previousItemIds?: string[];
  lockedItemIds?: string[];
  excludedItemIds?: string[];
  minimumCoreChanges?: number;
  maximumOverlap?: number;
};

export type ResolvedRegenerationPolicy = {
  enabled: boolean;
  requestKind: "initial" | "regenerate" | "anchor";
  previousRecommendationId: string | null;
  previousItemIds: string[];
  previousCoreItemIds: string[];
  previousFinisherItemIds: string[];
  previousProminentItemIds: string[];
  previousStructure: OutfitStructure | null;
  requireStructureChange: boolean;
  allowedStructures: OutfitStructure[];
  lockedItemIds: string[];
  excludedItemIds: string[];
  minimumCoreChanges: number;
  maximumOverlap: number;
};

export type RegenerationEvaluation = {
  valid: boolean;
  exactRepeat: boolean;
  overlap: number;
  sharedItemCount: number;
  sharedCoreItemCount: number;
  coreChanges: number;
  minimumCoreChanges: number;
  maximumOverlap: number;
  missingLockedItemIds: string[];
  includedExcludedItemIds: string[];
  sharedProminentItemIds: string[];
  previousStructure: OutfitStructure | null;
  currentStructure: OutfitStructure | null;
  structureChanged: boolean;
  rejectionReasons: string[];
};

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function uniqueIds(values: unknown[] = []) {
  return Array.from(new Set(values.map(String).map((value) => value.trim()).filter(Boolean)));
}

function isCoreItem(item: any) {
  return !["bag", "accessory"].includes(normalizeOutfitSlot(item));
}

function isProminentItem(item: any) {
  return ["outerwear", "onePiece"].includes(normalizeOutfitSlot(item));
}

function structureSample(items: any[], structure: OutfitStructure) {
  if (structure === "dress_one_piece") {
    const onePiece = items.find((item) => item?.category !== "native" && outfitSlotsForItem(item).includes("onePiece"));
    return onePiece ? [onePiece] : [];
  }
  if (structure === "native_one_piece") {
    const onePiece = items.find((item) => item?.category === "native" && outfitSlotsForItem(item).includes("onePiece"));
    return onePiece ? [onePiece] : [];
  }
  const scoped = structure === "native_separates" ? items.filter((item) => item?.category === "native") : items;
  const top = scoped.find((item) => outfitSlotsForItem(item).includes("top"));
  const bottom = scoped.find((item) => outfitSlotsForItem(item).includes("bottom"));
  return top && bottom ? Array.from(new Set([top, bottom])) : [];
}

function hasDistinctAlternativeStructure(
  wardrobeItems: any[],
  previousStructure: OutfitStructure,
  allowedStructures: OutfitStructure[]
) {
  return allowedStructures.some((structure) => {
    if (structure === previousStructure) return false;
    const sample = structureSample(wardrobeItems, structure);
    if (!sample.length) return false;
    const satisfiesAlternative = evaluateOutfitCompleteness(sample, { allowedStructures: [structure] }).satisfiedStructure === structure;
    const alsoSatisfiesPrevious = evaluateOutfitCompleteness(sample, { allowedStructures: [previousStructure] }).satisfiedStructure === previousStructure;
    return satisfiesAlternative && !alsoSatisfiesPrevious;
  });
}

export function resolveRegenerationPolicy(
  context: RecommendationRegenerationContext | undefined,
  wardrobeItems: any[] = [],
  options: { allowedStructures?: OutfitStructure[] } = {}
): ResolvedRegenerationPolicy {
  const wardrobeById = new Map<string, any>(
    wardrobeItems.map((item): [string, any] => [itemId(item), item]).filter(([id]) => Boolean(id))
  );
  const ownedIds = new Set(wardrobeById.keys());
  const owned = (values: unknown[] = []) => uniqueIds(values).filter((id) => ownedIds.has(id));
  const previousItemIds = owned(context?.previousItemIds || []);
  const lockedItemIds = owned(context?.lockedItemIds || []);
  const excludedItemIds = owned(context?.excludedItemIds || []).filter((id) => !lockedItemIds.includes(id));
  const previousCoreItemIds = previousItemIds.filter((id) => isCoreItem(wardrobeById.get(id)));
  const previousFinisherItemIds = previousItemIds.filter((id) => !previousCoreItemIds.includes(id));
  const previousProminentItemIds = previousItemIds.filter((id) => isProminentItem(wardrobeById.get(id)));
  const allowedStructures = options.allowedStructures?.length ? options.allowedStructures : undefined;
  const previousStructure = evaluateOutfitCompleteness(
    previousItemIds.map((id) => wardrobeById.get(id)).filter(Boolean),
    { allowedStructures }
  ).satisfiedStructure;
  const requireStructureChange = Boolean(
    previousStructure && allowedStructures?.length && hasDistinctAlternativeStructure(wardrobeItems, previousStructure, allowedStructures)
  );
  const enabled = ["regenerate", "anchor"].includes(context?.requestKind || "") && previousItemIds.length > 0;
  const requestedMinimum = Math.max(1, Math.min(4, Math.round(Number(context?.minimumCoreChanges ?? 2))));
  const lockedPreviousCoreCount = previousCoreItemIds.filter((id) => lockedItemIds.includes(id)).length;
  const changeableCoreCount = Math.max(0, previousCoreItemIds.length - lockedPreviousCoreCount);

  return {
    enabled,
    requestKind: context?.requestKind || "initial",
    previousRecommendationId: context?.previousRecommendationId || null,
    previousItemIds,
    previousCoreItemIds,
    previousFinisherItemIds,
    previousProminentItemIds,
    previousStructure,
    requireStructureChange,
    allowedStructures: allowedStructures || [],
    lockedItemIds,
    excludedItemIds,
    minimumCoreChanges: context?.requestKind === "anchor" ? 0 : enabled ? Math.min(requestedMinimum, changeableCoreCount) : 0,
    maximumOverlap: context?.requestKind === "anchor" ? 1 : Math.max(0, Math.min(0.8, Number(context?.maximumOverlap ?? 0.4)))
  };
}

export function evaluateRegenerationCandidate(
  items: any[] = [],
  policy?: ResolvedRegenerationPolicy
): RegenerationEvaluation {
  const currentItemIds = uniqueIds(items.map(itemId));
  const currentIdSet = new Set(currentItemIds);
  const previousIds = policy?.previousItemIds || [];
  const previousIdSet = new Set(previousIds);
  const sharedItemIds = currentItemIds.filter((id) => previousIdSet.has(id));
  const sharedCoreItemCount = (policy?.previousCoreItemIds || []).filter((id) => currentIdSet.has(id)).length;
  const coreChanges = Math.max(0, (policy?.previousCoreItemIds.length || 0) - sharedCoreItemCount);
  const overlapDenominator = Math.max(1, currentItemIds.length, previousIds.length);
  const overlap = sharedItemIds.length / overlapDenominator;
  const missingLockedItemIds = (policy?.lockedItemIds || []).filter((id) => !currentIdSet.has(id));
  const includedExcludedItemIds = (policy?.excludedItemIds || []).filter((id) => currentIdSet.has(id));
  const sharedProminentItemIds = (policy?.previousProminentItemIds || [])
    .filter((id) => currentIdSet.has(id))
    .filter((id) => !(policy?.lockedItemIds || []).includes(id));
  const currentStructure = evaluateOutfitCompleteness(items, {
    allowedStructures: policy?.allowedStructures.length ? policy.allowedStructures : undefined
  }).satisfiedStructure;
  const structureChanged = Boolean(policy?.previousStructure && currentStructure && currentStructure !== policy.previousStructure);
  const exactRepeat = Boolean(
    previousIds.length &&
    currentItemIds.length === previousIds.length &&
    sharedItemIds.length === previousIds.length
  );
  const rejectionReasons: string[] = [];

  if (policy?.enabled) {
    if (exactRepeat) rejectionReasons.push("exact_repeat");
    if (coreChanges < policy.minimumCoreChanges) rejectionReasons.push("insufficient_core_changes");
    if (overlap > policy.maximumOverlap) rejectionReasons.push("maximum_overlap_exceeded");
    if (missingLockedItemIds.length) rejectionReasons.push("locked_item_missing");
    if (includedExcludedItemIds.length) rejectionReasons.push("excluded_item_present");
    if (policy.minimumCoreChanges > 0 && sharedProminentItemIds.length) rejectionReasons.push("prominent_item_repeated");
    if (policy.minimumCoreChanges > 0 && policy.requireStructureChange && !structureChanged) rejectionReasons.push("outfit_structure_repeated");
  }

  return {
    valid: !policy?.enabled || rejectionReasons.length === 0,
    exactRepeat,
    overlap: Math.round(overlap * 1000) / 1000,
    sharedItemCount: sharedItemIds.length,
    sharedCoreItemCount,
    coreChanges,
    minimumCoreChanges: policy?.minimumCoreChanges || 0,
    maximumOverlap: policy?.maximumOverlap ?? 1,
    missingLockedItemIds,
    includedExcludedItemIds,
    sharedProminentItemIds,
    previousStructure: policy?.previousStructure || null,
    currentStructure,
    structureChanged,
    rejectionReasons
  };
}

export function logRecommendationDiversity(input: {
  flow: "create" | "match";
  policy: ResolvedRegenerationPolicy;
  evaluation?: RegenerationEvaluation;
  candidateCount?: number;
  eligibleCandidateCount?: number;
  status: "not_requested" | "satisfied" | "fallback";
}) {
  console.info("fitpick.recommendation.diversity", {
    flow: input.flow,
    status: input.status,
    regenerationRequested: input.policy.enabled,
    previousItemCount: input.policy.previousItemIds.length,
    previousCoreItemCount: input.policy.previousCoreItemIds.length,
    candidateCount: input.candidateCount || 0,
    eligibleCandidateCount: input.eligibleCandidateCount || 0,
    overlap: input.evaluation?.overlap,
    sharedItemCount: input.evaluation?.sharedItemCount,
    sharedProminentItemCount: input.evaluation?.sharedProminentItemIds.length,
    coreChanges: input.evaluation?.coreChanges,
    previousStructure: input.evaluation?.previousStructure || input.policy.previousStructure,
    currentStructure: input.evaluation?.currentStructure,
    structureChanged: input.evaluation?.structureChanged,
    structureChangeRequired: input.policy.requireStructureChange,
    minimumCoreChanges: input.policy.minimumCoreChanges,
    maximumOverlap: input.policy.maximumOverlap,
    rejectionReasons: input.evaluation?.rejectionReasons || [],
    timestamp: new Date().toISOString()
  });
}
