import assert from "node:assert/strict";
import { buildLearningSignals } from "@/lib/recommendation/learning-engine";
import { buildInternalStyleProfile } from "@/lib/recommendation/style-profile";

const items = [
  { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", category: "outerwear", color: "red" },
  { _id: "bbbbbbbbbbbbbbbbbbbbbbbb", category: "shoes", color: "black" }
];

const noAttributeLearning = buildLearningSignals({
  items,
  memorySummary: {
    eventCount: 1,
    positive: { itemIds: [], colors: [], categories: [], brands: [], fits: [] },
    negative: { itemIds: [], colors: [], categories: [], brands: [], fits: [] }
  }
});
assert.deepEqual(noAttributeLearning.preferredColors, []);
assert.deepEqual(noAttributeLearning.avoidedCategories, []);

const explicitItemLearning = buildLearningSignals({
  items,
  memorySummary: {
    eventCount: 2,
    positive: { itemIds: ["bbbbbbbbbbbbbbbbbbbbbbbb"], colors: ["black"], categories: ["shoes"], brands: [], fits: [] },
    negative: { itemIds: [], colors: [], categories: [], brands: [], fits: [] }
  }
});
assert.deepEqual(explicitItemLearning.preferredColors, ["black"]);
assert.deepEqual(explicitItemLearning.preferredCategories, ["shoes"]);

const profile = buildInternalStyleProfile({
  styleProfile: {
    favoriteColors: ["navy"],
    lifestyle: { workEnvironment: "creative office", walkingPriority: "high" },
    stylingConstraints: { heelHeightPreference: "low", garmentAvoidances: ["skinny jeans"] },
    stylingGoals: ["build a versatile work wardrobe"],
    contextualPreferences: [{ occasion: "weekend", preferredFits: ["relaxed"] }]
  },
  wardrobeItems: items,
  memorySummary: { eventCount: 0 }
});
assert.equal(profile.lifestyle.walkingPriority, "high");
assert.equal(profile.stylingConstraints.heelHeightPreference, "low");
assert.equal(profile.contextualPreferences[0].occasion, "weekend");

console.log("Phase 1 stylist memory tests passed.");
