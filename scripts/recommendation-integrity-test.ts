import assert from "node:assert/strict";
import {
  buildRecommendationPieces,
  constrainStylistToFinalizedRecommendation,
  finalizeRecommendationItems,
  recommendationIntegrityDiagnostics
} from "../lib/recommendation/integrity";

const item = (id: string, category: string, name: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  category,
  name,
  color: "black",
  condition: "ready",
  ...extra
});

const sixPieceLook = [
  item("shirt", "tops", "White shirt", { imageUrl: "https://example.test/shirt.webp" }),
  item("trousers", "bottoms", "Black tailored trousers", { imageUrl: "https://example.test/trousers.webp" }),
  item("blazer", "outerwear", "Red blazer", { imageUrl: "https://example.test/blazer.webp" }),
  item("boots", "shoes", "Black ankle boots", { imageUrl: "https://example.test/boots.webp" }),
  item("bag", "bags", "Brown tote bag", { imageUrl: "https://example.test/bag.webp" }),
  item("watch", "accessories", "Gold wristwatch", { canonicalSubtype: "watch", imageUrl: "https://example.test/watch.webp" })
];

const finalized = finalizeRecommendationItems(sixPieceLook);
assert.equal(finalized.items.length, 6, "all six distinct outfit roles survive finalization");
assert.deepEqual(finalized.pieces.map((piece) => piece.wardrobeItemId), sixPieceLook.map((entry) => entry._id), "structured pieces preserve final IDs and order");
assert.deepEqual(finalized.pieces.map((piece) => piece.role), ["top", "bottom", "outerwear", "footwear", "bag", "accessory"]);

const fallbackImage = item("fallback", "accessories", "Silk scarf", {
  images: { back: { url: "https://example.test/scarf-back.webp" } }
});
assert.equal(buildRecommendationPieces([fallbackImage])[0].imageUrl, "https://example.test/scarf-back.webp", "alternate wardrobe image is used");

const noImage = buildRecommendationPieces([item("no-image", "accessories", "Labelled watch")])[0];
assert.equal(noImage.hasUsableImage, false, "imageless item remains represented as a placeholder model");
assert.equal(noImage.displayName, "Labelled watch");

const constrained = constrainStylistToFinalizedRecommendation({
  message: "Add an invented hat",
  recommendedItemIds: ["shirt", "invented"],
  alternativeItemIds: ["invented"],
  stylingTips: ["Mention an invented hat"],
  safetyWarnings: []
}, {
  items: finalized.items,
  whyItWorks: "The six finalized closet pieces create a complete look.",
  stylingTips: ["Wear the finalized boots with the tailored hem."]
});
assert.deepEqual(constrained.recommendedItemIds, sixPieceLook.map((entry) => entry._id), "stylist metadata is exactly the finalized outfit");
assert.equal(constrained.message, "The six finalized closet pieces create a complete look.", "free-form AI prose cannot introduce a seventh item");

const valid = recommendationIntegrityDiagnostics({
  finalizedItems: sixPieceLook,
  persistedItemIds: sixPieceLook.map((entry) => entry._id),
  serializedItems: sixPieceLook,
  stylingItemIds: sixPieceLook.map((entry) => entry._id)
});
assert.equal(valid.valid, true, "matching finalized, persisted, serialized and styling IDs pass");

const legacyMismatch = recommendationIntegrityDiagnostics({
  finalizedItems: sixPieceLook,
  persistedItemIds: ["trousers", "blazer"],
  serializedItems: [sixPieceLook[1], sixPieceLook[2]],
  stylingItemIds: sixPieceLook.map((entry) => entry._id)
});
assert.equal(legacyMismatch.valid, false, "legacy records with fewer references fail safely");
assert.ok(legacyMismatch.missingPersistedItemIds.includes("boots"), "diagnostics identify missing persisted IDs");

console.log("Recommendation integrity tests passed.");
