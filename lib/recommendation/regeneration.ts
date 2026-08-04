import { normalizeOutfitSlot } from "@/lib/recommendation/outfit-slots";

export type RecommendationRegenerationContext = {
  requestKind?: "initial" | "regenerate";
  previousRecommendationId?: string | null;
  previousItemIds?: string[];
  lockedItemIds?: string[];
  excludedItemIds?: string[];
  minimumCoreChanges?: number;
  maximumOverlap?: number;
};

export type ResolvedRegenerationPolicy = {
  enabled: boolean;
  previousRecommendationId: string | null;
  previousItemIds: string[];
  previousCoreItemIds: string[];
  previousFinisherItemIds: string[];
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

export function resolveRegenerationPolicy(
  context: RecommendationRegenerationContext | undefined,
  wardrobeItems: any[] = []
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
  const enabled = context?.requestKind === "regenerate" && previousItemIds.length > 0;
  const requestedMinimum = Math.max(1, Math.min(4, Math.round(Number(context?.minimumCoreChanges ?? 2))));
  const lockedPreviousCoreCount = previousCoreItemIds.filter((id) => lockedItemIds.includes(id)).length;
  const changeableCoreCount = Math.max(0, previousCoreItemIds.length - lockedPreviousCoreCount);

  return {
    enabled,
    previousRecommendationId: context?.previousRecommendationId || null,
    previousItemIds,
    previousCoreItemIds,
    previousFinisherItemIds,
    lockedItemIds,
    excludedItemIds,
    minimumCoreChanges: enabled ? Math.min(requestedMinimum, changeableCoreCount) : 0,
    maximumOverlap: Math.max(0, Math.min(0.8, Number(context?.maximumOverlap ?? 0.4)))
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
    coreChanges: input.evaluation?.coreChanges,
    minimumCoreChanges: input.policy.minimumCoreChanges,
    maximumOverlap: input.policy.maximumOverlap,
    rejectionReasons: input.evaluation?.rejectionReasons || [],
    timestamp: new Date().toISOString()
  });
}
