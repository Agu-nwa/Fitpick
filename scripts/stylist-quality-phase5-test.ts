import assert from "node:assert/strict";
import { buildOutfitHistorySummary } from "../lib/recommendation/history-summary";
import { computeRecommendationQuality, outcomeValue } from "../lib/recommendation/quality";

const summary = buildOutfitHistorySummary([
  {
    itemIds: ["a", "b", "c"],
    itemSignature: "a|b|c",
    rejectedAt: new Date(),
    itemFeedback: [
      { itemId: "b", liked: false, reason: "wrong fit" },
      { itemId: "a", liked: true }
    ]
  }
]);

assert.deepEqual(summary.rejectedItemIds, ["b"], "whole-look rejection must not poison every item");
assert.deepEqual(summary.explicitlyLikedItemIds, ["a"]);

const records = [
  { confidenceScore: 0.9, completenessStatus: "complete", footwearIncluded: true, acceptedAt: new Date(), wornAt: new Date() },
  { confidenceScore: 0.8, completenessStatus: "complete", footwearIncluded: true, savedAt: new Date() },
  { confidenceScore: 0.7, completenessStatus: "missing_footwear", footwearIncluded: false, rejectedAt: new Date() },
  { confidenceScore: 0.6, completenessStatus: "complete", footwearIncluded: true, viewedAt: new Date() }
];
const quality = computeRecommendationQuality(records);
assert.equal(quality.generatedCount, 4);
assert.equal(quality.wearThroughRate, 0.25);
assert.equal(quality.completeOutfitRate, 0.75);
assert.equal(quality.footwearInclusionRate, 0.75);
assert.ok(typeof quality.brierScore === "number" && quality.brierScore >= 0 && quality.brierScore <= 1);
assert.equal(outcomeValue({ wornAt: new Date() }), 1);
assert.equal(outcomeValue({ rejectedAt: new Date() }), 0);

console.log("stylist quality phase 5 tests passed");
