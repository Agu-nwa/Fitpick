import assert from "node:assert/strict";
import { buildWardrobePlan, findUnderusedWardrobeItems } from "../lib/recommendation/wardrobe-planner";

const item = (id: string, category: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  name: `${category}-${id}`,
  category,
  subcategory: category,
  color: id.endsWith("1") ? "Black" : "Blue",
  condition: "ready",
  occasions: ["everyday", "work", "travel"],
  weather: ["mild"],
  recommendationCount: 0,
  timesWorn: 0,
  ...extra
});

const wardrobe = [
  item("000000000000000000000001", "tops"),
  item("000000000000000000000002", "tops", { recommendationCount: 8 }),
  item("000000000000000000000003", "bottoms"),
  item("000000000000000000000004", "bottoms", { recommendationCount: 5 }),
  item("000000000000000000000005", "shoes"),
  item("000000000000000000000006", "shoes", { recommendationCount: 4 }),
  item("000000000000000000000007", "outerwear"),
  item("000000000000000000000008", "bags"),
  item("000000000000000000000009", "accessories"),
  item("000000000000000000000010", "tops", { condition: "needs-care" })
];

const underused = findUnderusedWardrobeItems(wardrobe, 3);
assert.equal(String(underused[0]._id), "000000000000000000000001");
assert.ok(!underused.some((entry) => entry.condition === "needs-care"));

const plan = buildWardrobePlan({
  type: "packing",
  days: 3,
  occasions: ["Everyday travel"],
  destination: "Lagos",
  wardrobeItems: wardrobe,
  allowNeedsCare: false,
  weatherContext: "Warm and mild",
  outfitHistorySummary: { eventCount: 0, recentRecommendationItemIdLists: [], recentItemRecommendationCounts: {} }
});

assert.equal(plan.type, "packing");
assert.ok(plan.looks.length >= 1);
assert.ok(plan.packingList.length >= 1);
assert.ok(plan.unavailableItems.some((entry) => entry.itemId === "000000000000000000000010" && entry.reason === "needs_care"));
assert.ok(plan.looks.every((look) => !look.itemIds.includes("000000000000000000000010")));
assert.equal(new Set(plan.looks.map((look) => [...look.itemIds].sort().join("|"))).size, plan.looks.length);

console.log("stylist planning phase 4 tests passed");
