import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const stylistChat = readFileSync("components/stylist/StylistChat.tsx", "utf8");
const apiClient = readFileSync("lib/api-client.ts", "utf8");

assert.ok(
  stylistChat.includes('requestKind: "regenerate"'),
  "Regenerate actions send a structured server contract."
);
assert.ok(
  stylistChat.includes("previousRecommendationId") && stylistChat.includes("previousItemIds"),
  "Regenerate actions identify the exact recommendation being replaced."
);
assert.ok(
  stylistChat.includes("minimumCoreChanges: 2") && stylistChat.includes("maximumOverlap"),
  "Regenerate actions request a meaningfully different outfit."
);
assert.ok(
  stylistChat.includes("lockedItemIds") && stylistChat.includes("excludedItemIds"),
  "Refinement chips can preserve or exclude specific closet items."
);
assert.ok(
  apiClient.includes("RecommendationRegenerationRequest") && apiClient.includes("regeneration?:"),
  "The typed client forwards structured regeneration constraints."
);

console.log("Recommendation regeneration UI checks passed.");
