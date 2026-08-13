import assert from "node:assert/strict";
import { buildStylistContext } from "../lib/ai/context/stylist-context";
import {
  assertRecommendationLifecycleComplete,
  buildRecommendationLifecycle,
  buildVerifiedRecommendationCopy,
  orderVerifiedRecommendationItems,
  recommendationOwnershipQuery,
  RecommendationPersistenceIntegrityError
} from "../lib/recommendation/persistence-integrity";

function id(index: number) {
  return index.toString(16).padStart(24, "0");
}

function item(index: number, category: string, name: string, patch: Record<string, unknown> = {}) {
  return {
    _id: id(index),
    userId: id(900),
    name,
    category,
    subcategory: category,
    condition: "ready",
    updatedAt: new Date(Date.UTC(2026, 0, (index % 28) + 1)),
    recommendationCount: index % 7,
    ...patch
  };
}

const categories = ["tops", "bottoms", "outerwear", "shoes", "bags", "accessories"];
const wardrobe = Array.from({ length: 60 }, (_, index) =>
  item(index + 1, categories[index % categories.length], `Item ${index + 1}`)
);
const context = buildStylistContext(wardrobe);
assert.equal(context.promptWardrobeItems.length, 50, "AI prompt context remains capped at 50 items");
assert.equal(context.ownedItemIds.length, 60, "authorization context retains every eligible owned item");
assert.deepEqual(
  new Set(context.promptWardrobeItems.map((entry) => entry.category)),
  new Set(categories),
  "balanced prompt sampling preserves category coverage"
);
assert.deepEqual(
  buildStylistContext([...wardrobe].reverse()).promptWardrobeItems.map((entry) => entry.id),
  context.promptWardrobeItems.map((entry) => entry.id),
  "prompt sampling is deterministic and independent of MongoDB natural order"
);
const promptIds = new Set(context.promptWardrobeItems.map((entry) => entry.id));
const outsidePrompt = wardrobe.find((entry) => !promptIds.has(entry._id));
assert.ok(outsidePrompt, "the fixture contains an item beyond the prompt sample");
const ownershipQuery = recommendationOwnershipQuery(id(900), [id(1), id(59)]);
assert.equal(ownershipQuery.userId, id(900), "ownership resolution is scoped to the authenticated user");
assert.equal(ownershipQuery.archivedAt, null, "archived items are excluded authoritatively");

const engineSelected = [
  item(101, "tops", "Ivory shirt"),
  item(102, "bottoms", "Tailored trousers"),
  item(103, "outerwear", "Navy blazer"),
  item(104, "shoes", "Leather loafers"),
  item(105, "bags", "Structured bag"),
  { ...outsidePrompt, _id: id(106), category: "accessories", name: "Gold watch" }
];
const simulatedDatabaseResult = [engineSelected[4], engineSelected[1], engineSelected[5], engineSelected[0], engineSelected[3], engineSelected[2]];
const selectedIds = engineSelected.map((entry) => entry._id);
const ordered = orderVerifiedRecommendationItems(selectedIds, simulatedDatabaseResult);
assert.deepEqual(ordered.map((entry: any) => entry._id), selectedIds, "database verification preserves engine order");

const validLifecycle = buildRecommendationLifecycle({
  engineSelectedItems: engineSelected,
  ownershipResolvedItems: ordered,
  sanitizedItems: ordered,
  persistedItemIds: selectedIds,
  serializedItems: ordered,
  renderedItemIds: selectedIds
});
assert.doesNotThrow(() => assertRecommendationLifecycleComplete(validLifecycle));
assert.equal(validLifecycle.losses.length, 0, "a full matching lifecycle is valid");
assert.equal(validLifecycle.persistedItemIds.length, 6, "all six selected owned items survive persistence");
assert.equal(validLifecycle.serializedItemIds.length, validLifecycle.persistedItemIds.length, "serialized count equals persisted count");
assert.equal(validLifecycle.renderedItemIds.length, validLifecycle.persistedItemIds.length, "card/render count equals persisted count");
assert.equal(validLifecycle.serializationOrderPreserved, true, "serialization preserves engine order");

const reorderedLifecycle = buildRecommendationLifecycle({
  engineSelectedItems: engineSelected,
  ownershipResolvedItems: ordered,
  sanitizedItems: ordered,
  persistedItemIds: selectedIds,
  serializedItems: [...ordered].reverse(),
  renderedItemIds: [...selectedIds].reverse()
});
assert.throws(
  () => assertRecommendationLifecycleComplete(reorderedLifecycle),
  (error) => error instanceof RecommendationPersistenceIntegrityError && error.code === "verified_recommendation_incomplete",
  "a reordered serialized recommendation fails integrity validation"
);

const foreignCoreLifecycle = buildRecommendationLifecycle({
  engineSelectedItems: engineSelected,
  ownershipResolvedItems: ordered.filter((entry: any) => entry.category !== "shoes")
});
assert.throws(
  () => assertRecommendationLifecycleComplete(foreignCoreLifecycle),
  (error) => error instanceof RecommendationPersistenceIntegrityError && error.code === "missing_verified_footwear",
  "a foreign or archived selected footwear item fails safely"
);
assert.equal(foreignCoreLifecycle.losses[0]?.reason, "item_missing_during_ownership_resolution");

const optionalLossItems = ordered.filter((entry: any) => entry.category !== "accessories");
const optionalLifecycle = buildRecommendationLifecycle({
  engineSelectedItems: engineSelected,
  ownershipResolvedItems: optionalLossItems,
  sanitizedItems: optionalLossItems
});
assert.doesNotThrow(() => assertRecommendationLifecycleComplete(optionalLifecycle), "optional item loss degrades explicitly instead of becoming a silent core failure");
assert.equal(optionalLifecycle.losses[0]?.critical, false);
const copy = buildVerifiedRecommendationCopy({
  occasion: "Wedding",
  items: optionalLossItems,
  optionalLosses: optionalLifecycle.losses
});
assert.ok(copy.whyItWorks.includes("sets the upper-body colour") && copy.whyItWorks.includes("grounds the outfit"), "verified recommendation copy preserves a concrete reason for each selected item");
assert.ok(copy.warnings[0]?.includes("optional finishing item"));
assert.equal(copy.summary.includes("Gold watch"), false, "reconciled text never names an omitted item");
assert.ok(optionalLossItems.every((entry: any) => copy.summary.includes(entry.name)), "reconciled summary names only verified items");

const missingReference = buildRecommendationLifecycle({
  engineSelectedItems: engineSelected,
  ownershipResolvedItems: ordered,
  referenceAnchorMissing: true
});
assert.throws(
  () => assertRecommendationLifecycleComplete(missingReference),
  (error) => error instanceof RecommendationPersistenceIntegrityError && error.code === "missing_verified_reference_anchor",
  "Match reference anchors remain mandatory"
);

console.log("Recommendation persistence integrity tests passed.");
