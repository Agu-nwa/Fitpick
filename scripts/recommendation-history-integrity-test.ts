import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildOutfitHistorySummary } from "../lib/recommendation/history-summary";

const model = readFileSync("models/OutfitHistory.ts", "utf8");
const history = readFileSync("lib/recommendation/history.ts", "utf8");
const chatRoute = readFileSync("app/api/stylist/chat/route.ts", "utf8");
const matchRoute = readFileSync("app/api/stylist/reference-items/[id]/recommendations/route.ts", "utf8");
assert.ok(model.includes("{ userId: 1, outfitId: 1 }") && model.includes("unique: true"), "outfit history enforces user-scoped outfit idempotency");
assert.ok(history.includes("OutfitHistory.find({ userId })"), "history reads are user scoped");
assert.ok(history.includes("findOneAndUpdate") && history.includes("upsert: true"), "duplicate and concurrent history writes are idempotent");
assert.equal(
  history.match(/generatedAt: now/g)?.length,
  1,
  "generated history writes never assign generatedAt through conflicting MongoDB update operators"
);
assert.ok(chatRoute.includes('eventType: "generated"'), "Create Look success records generated history");
assert.ok(matchRoute.includes('eventType: "generated"'), "Match success records generated history");
assert.ok(!matchRoute.includes('eventType: "failed"'), "failed Match requests do not create recommendation history");
const summary = buildOutfitHistorySummary([
  { itemSignature: "a:b", itemIds: ["a", "b"], generatedAt: new Date("2026-08-04") },
  { itemSignature: "a:c", itemIds: ["a", "c"], generatedAt: new Date("2026-08-03"), editedAt: new Date("2026-08-03") }
]);
assert.deepEqual(summary.lastRecommendationItemIds, ["a", "b"], "latest valid recommendation is retained distinctly");
assert.equal(summary.recentItemRecommendationCounts.a, 2, "repeated hero frequency is measured");
assert.ok(summary.regeneratedItemIds.includes("c"), "regeneration history is represented distinctly");
console.log("Recommendation history integrity checks passed.");
