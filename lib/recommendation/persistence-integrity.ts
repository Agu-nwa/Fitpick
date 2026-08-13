import { normalizeOutfitSlot, sanitizeOutfitItems, type OutfitSlot } from "@/lib/recommendation/outfit-slots";

export type RecommendationLifecycleReason =
  | "item_missing_during_ownership_resolution"
  | "item_removed_during_sanitization"
  | "item_missing_during_persistence"
  | "item_missing_during_serialization"
  | "item_missing_during_rendering"
  | "missing_verified_reference_anchor";

export type RecommendationLifecycleLoss = {
  itemId: string;
  role: OutfitSlot | "reference";
  reason: RecommendationLifecycleReason;
  critical: boolean;
};

export type RecommendationLifecycle = {
  engineSelectedItemIds: string[];
  ownershipResolvedItemIds: string[];
  sanitizedItemIds: string[];
  persistedItemIds: string[];
  serializedItemIds: string[];
  renderedItemIds: string[];
  ownershipOrderPreserved: boolean;
  sanitizationOrderPreserved: boolean;
  persistenceOrderPreserved: boolean;
  serializationOrderPreserved: boolean;
  renderingOrderPreserved: boolean;
  losses: RecommendationLifecycleLoss[];
};

const objectIdPattern = /^[a-f\d]{24}$/i;
const criticalSlots = new Set<OutfitSlot>(["top", "bottom", "onePiece", "shoes"]);

export class RecommendationPersistenceIntegrityError extends Error {
  readonly code:
    | "verified_recommendation_incomplete"
    | "missing_verified_core_item"
    | "missing_verified_footwear"
    | "missing_verified_reference_anchor";
  readonly diagnostics: RecommendationLifecycle;

  constructor(
    code: RecommendationPersistenceIntegrityError["code"],
    diagnostics: RecommendationLifecycle
  ) {
    super("The verified wardrobe selection is no longer complete.");
    this.name = "RecommendationPersistenceIntegrityError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export function recommendationItemId(item: any) {
  return String(item?._id || item?.id || "").trim();
}

export function normalizeRecommendationItemIds(items: any[] = []) {
  return Array.from(
    new Set(items.map(recommendationItemId).filter(Boolean))
  ).slice(0, 20);
}

export function validRecommendationItemIds(items: any[] = []) {
  return normalizeRecommendationItemIds(items).filter((id) => objectIdPattern.test(id));
}

export function recommendationOwnershipQuery(userId: string, selectedIds: string[]) {
  return {
    _id: { $in: selectedIds },
    userId,
    archivedAt: null
  };
}

export function orderVerifiedRecommendationItems(selectedIds: string[], verifiedItems: any[]) {
  const verifiedById = new Map(
    verifiedItems.map((item) => [recommendationItemId(item), item] as const)
  );
  return selectedIds.map((id) => verifiedById.get(id)).filter(Boolean);
}

function itemRoleById(items: any[]) {
  return new Map(items.map((item) => [recommendationItemId(item), normalizeOutfitSlot(item)]));
}

function missing(expected: string[], actual: string[]) {
  const actualIds = new Set(actual);
  return expected.filter((id) => !actualIds.has(id));
}

function sameOrder(expected: string[], actual: string[]) {
  return expected.length === actual.length && expected.every((id, index) => id === actual[index]);
}

function preservesRelativeOrder(expected: string[], actual: string[]) {
  const actualIds = new Set(actual);
  return sameOrder(expected.filter((id) => actualIds.has(id)), actual);
}

export function buildRecommendationLifecycle(input: {
  engineSelectedItems: any[];
  ownershipResolvedItems: any[];
  sanitizedItems?: any[];
  persistedItemIds?: unknown[];
  serializedItems?: any[];
  renderedItemIds?: unknown[];
  referenceAnchorMissing?: boolean;
}) {
  const engineSelectedItemIds = normalizeRecommendationItemIds(input.engineSelectedItems);
  const ownershipResolvedItemIds = normalizeRecommendationItemIds(input.ownershipResolvedItems);
  const sanitizedResult = input.sanitizedItems
    ? { items: input.sanitizedItems, removed: [] as Array<{ itemId: string; slot: OutfitSlot }> }
    : sanitizeOutfitItems(input.ownershipResolvedItems);
  const sanitizedItemIds = normalizeRecommendationItemIds(sanitizedResult.items);
  const persistedItemIds = Array.from(new Set((input.persistedItemIds || sanitizedItemIds).map(String).filter(Boolean)));
  const serializedItemIds = input.serializedItems
    ? normalizeRecommendationItemIds(input.serializedItems)
    : [...persistedItemIds];
  const renderedItemIds = Array.from(new Set((input.renderedItemIds || serializedItemIds).map(String).filter(Boolean)));
  const roles = itemRoleById(input.engineSelectedItems);
  const criticalIds = new Set(
    input.engineSelectedItems
      .filter((item) => criticalSlots.has(normalizeOutfitSlot(item)) || String(item?.category || "").toLowerCase() === "native")
      .map(recommendationItemId)
  );
  const losses: RecommendationLifecycleLoss[] = [];

  for (const itemId of missing(engineSelectedItemIds, ownershipResolvedItemIds)) {
    const role = roles.get(itemId) || "unknown";
    losses.push({
      itemId,
      role,
      reason: "item_missing_during_ownership_resolution",
      critical: criticalIds.has(itemId)
    });
  }
  for (const itemId of missing(ownershipResolvedItemIds, sanitizedItemIds)) {
    const role = roles.get(itemId) || "unknown";
    losses.push({ itemId, role, reason: "item_removed_during_sanitization", critical: criticalIds.has(itemId) });
  }
  for (const itemId of missing(sanitizedItemIds, persistedItemIds)) {
    const role = roles.get(itemId) || "unknown";
    losses.push({ itemId, role, reason: "item_missing_during_persistence", critical: criticalIds.has(itemId) });
  }
  for (const itemId of missing(persistedItemIds, serializedItemIds)) {
    const role = roles.get(itemId) || "unknown";
    losses.push({ itemId, role, reason: "item_missing_during_serialization", critical: criticalIds.has(itemId) });
  }
  for (const itemId of missing(serializedItemIds, renderedItemIds)) {
    const role = roles.get(itemId) || "unknown";
    losses.push({ itemId, role, reason: "item_missing_during_rendering", critical: criticalIds.has(itemId) });
  }
  if (input.referenceAnchorMissing) {
    losses.push({
      itemId: "reference-anchor",
      role: "reference",
      reason: "missing_verified_reference_anchor",
      critical: true
    });
  }

  return {
    engineSelectedItemIds,
    ownershipResolvedItemIds,
    sanitizedItemIds,
    persistedItemIds,
    serializedItemIds,
    renderedItemIds,
    ownershipOrderPreserved: preservesRelativeOrder(engineSelectedItemIds, ownershipResolvedItemIds),
    sanitizationOrderPreserved: preservesRelativeOrder(ownershipResolvedItemIds, sanitizedItemIds),
    persistenceOrderPreserved: sameOrder(sanitizedItemIds, persistedItemIds),
    serializationOrderPreserved: sameOrder(persistedItemIds, serializedItemIds),
    renderingOrderPreserved: sameOrder(serializedItemIds, renderedItemIds),
    losses
  } satisfies RecommendationLifecycle;
}

export function assertRecommendationLifecycleComplete(lifecycle: RecommendationLifecycle) {
  const referenceLoss = lifecycle.losses.find((loss) => loss.role === "reference");
  if (referenceLoss) {
    throw new RecommendationPersistenceIntegrityError("missing_verified_reference_anchor", lifecycle);
  }
  const footwearLoss = lifecycle.losses.find((loss) => loss.role === "shoes");
  if (footwearLoss) {
    throw new RecommendationPersistenceIntegrityError("missing_verified_footwear", lifecycle);
  }
  const coreLoss = lifecycle.losses.find((loss) => loss.critical);
  if (coreLoss) {
    throw new RecommendationPersistenceIntegrityError("missing_verified_core_item", lifecycle);
  }
  const boundaryLoss = lifecycle.losses.find((loss) =>
    ["item_missing_during_persistence", "item_missing_during_serialization", "item_missing_during_rendering"].includes(loss.reason)
  );
  if (boundaryLoss) {
    throw new RecommendationPersistenceIntegrityError("verified_recommendation_incomplete", lifecycle);
  }
  if (
    !lifecycle.ownershipOrderPreserved ||
    !lifecycle.sanitizationOrderPreserved ||
    !lifecycle.persistenceOrderPreserved ||
    !lifecycle.serializationOrderPreserved ||
    !lifecycle.renderingOrderPreserved
  ) {
    throw new RecommendationPersistenceIntegrityError("verified_recommendation_incomplete", lifecycle);
  }
  return lifecycle;
}

export function buildVerifiedRecommendationCopy(input: {
  occasion?: string;
  items: any[];
  optionalLosses?: RecommendationLifecycleLoss[];
}) {
  const occasion = String(input.occasion || "Today").trim().slice(0, 80) || "Today";
  const names = input.items
    .map((item) => String(item?.name || item?.subcategory || item?.category || "Closet item").trim())
    .filter(Boolean);
  const shoes = input.items.find((item) => normalizeOutfitSlot(item) === "shoes");
  const finishers = input.items.filter((item) => ["bag", "accessory"].includes(normalizeOutfitSlot(item)));
  const optionalLossCount = (input.optionalLosses || []).filter((loss) => !loss.critical).length;
  const warnings = optionalLossCount
    ? [`${optionalLossCount} optional finishing item${optionalLossCount === 1 ? " was" : "s were"} omitted because it was no longer available.`]
    : [];
  const itemReasons = input.items.map((item) => {
    const name = String(item?.name || item?.subcategory || item?.category || "Closet item").trim();
    const slot = normalizeOutfitSlot(item);
    if (slot === "top") return `${name} sets the upper-body colour and level of polish.`;
    if (slot === "bottom") return `${name} anchors the silhouette and balances the top.`;
    if (slot === "onePiece") return `${name} carries the main silhouette and occasion tone.`;
    if (slot === "outerwear") return `${name} adds structure and a practical finishing layer.`;
    if (slot === "shoes") return `${name} grounds the outfit at the intended formality.`;
    if (slot === "bag") return `${name} provides a practical carry piece without competing with the clothes.`;
    return `${name} adds a controlled finishing accent.`;
  });

  return {
    summary: `${names.join(", ")} form the verified ${occasion.toLowerCase()} outfit from your closet.`,
    whyItWorks: `${itemReasons.join(" ")} Together, these are the owned, available pieces in this look.`,
    stylingTips: [
      shoes ? `Finish the look with ${String(shoes.name || "the selected footwear")}.` : "",
      finishers.length
        ? `Keep ${finishers.map((item) => String(item.name || item.category || "the selected finisher")).join(" and ")} intentional and restrained.`
        : "Keep the proportions clean and intentional."
    ].filter(Boolean),
    warnings
  };
}

export function safeRecommendationLifecycleLog(lifecycle: RecommendationLifecycle) {
  const countReason = (reason: RecommendationLifecycleReason) => lifecycle.losses.filter((loss) => loss.reason === reason).length;
  return {
    engineSelectedCount: lifecycle.engineSelectedItemIds.length,
    ownershipResolvedCount: lifecycle.ownershipResolvedItemIds.length,
    sanitizedCount: lifecycle.sanitizedItemIds.length,
    persistedCount: lifecycle.persistedItemIds.length,
    serializedCount: lifecycle.serializedItemIds.length,
    renderedCount: lifecycle.renderedItemIds.length,
    ownershipOrderPreserved: lifecycle.ownershipOrderPreserved,
    sanitizationOrderPreserved: lifecycle.sanitizationOrderPreserved,
    persistenceOrderPreserved: lifecycle.persistenceOrderPreserved,
    serializationOrderPreserved: lifecycle.serializationOrderPreserved,
    renderingOrderPreserved: lifecycle.renderingOrderPreserved,
    missingAtOwnershipCount: countReason("item_missing_during_ownership_resolution"),
    removedAtSanitizationCount: countReason("item_removed_during_sanitization"),
    missingAtPersistenceCount: countReason("item_missing_during_persistence"),
    missingAtSerializationCount: countReason("item_missing_during_serialization"),
    missingAtRenderingCount: countReason("item_missing_during_rendering"),
    requiredRoleLoss: lifecycle.losses.some((loss) => loss.critical),
    lossReasons: lifecycle.losses.map((loss) => `${loss.reason}:${loss.role}`).slice(0, 20),
    criticalLossCount: lifecycle.losses.filter((loss) => loss.critical).length
  };
}
