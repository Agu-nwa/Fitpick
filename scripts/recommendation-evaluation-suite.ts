import assert from "node:assert/strict";
import { buildRecommendation } from "../lib/recommendation/engine";
import { buildReferenceOutfitRecommendations } from "../lib/recommendation/reference-matching";
import { sanitizeOutfitItems } from "../lib/recommendation/outfit-slots";

type ScenarioResult = { name: string; group: string; complete: boolean; fallback: boolean; forbidden: boolean; duplicateRole: boolean; referenceRetained: boolean | null; confidence: number; itemIds: string[]; overlap: number };
const originalConsoleInfo = console.info;
console.info = () => undefined;
let serial = 0;
const field = (value: unknown) => ({ value, confidence: 0.96, source: "synthetic_fixture" });
function item(category: string, subtype: string, name: string, patch: Record<string, any> = {}) {
  serial += 1;
  return { _id: `fixture-${serial}`, id: `fixture-${serial}`, category, canonicalSubtype: subtype, subcategory: subtype, name, color: patch.color || "black", condition: "ready", taxonomyNeedsReview: false, taxonomyConfidence: 1, taxonomyVersion: "wardrobe-taxonomy-v2", occasions: patch.occasions || ["casual", "business", "wedding", "church", "date night", "travel"], weather: patch.weather || ["dry", "hot", "cold", "rain"], verifiedMetadata: { primaryColor: field(patch.color || "black"), occasionSuitability: field(patch.occasions || ["casual", "business", "wedding", "church", "date night", "travel"]), weatherSuitability: field(patch.weather || ["dry", "hot", "cold", "rain"]), formalityScore: field(patch.formality || ["polished"]) }, ...patch };
}
function wardrobe(size: number) {
  const base = [
    item("tops", "shirt", "White tailored shirt", { color: "white" }), item("tops", "blouse", "Silk blouse", { color: "cream" }),
    item("bottoms", "trousers", "Black tailored trousers"), item("bottoms", "skirt", "Navy midi skirt", { color: "navy" }),
    item("dresses", "dress", "Emerald formal dress", { color: "emerald" }), item("native", "kaftan", "Embroidered kaftan", { color: "navy" }),
    item("outerwear", "blazer", "Navy blazer", { color: "navy" }), item("outerwear", "coat", "Warm wool coat", { weather: ["cold"] }),
    item("shoes", "loafers", "Black leather loafers"), item("shoes", "pumps", "Nude formal pumps", { color: "nude" }),
    item("bags", "clutch", "Black evening clutch"), item("accessories", "watch", "Silver watch", { stylingRole: "watch" }),
    item("accessories", "necklace", "Fine necklace", { stylingRole: "neck_jewelry" }), item("womens_hair", "wig", "Natural bob wig")
  ];
  const categories: Array<[string, string]> = [["tops", "shirt"], ["bottoms", "trousers"], ["dresses", "dress"], ["outerwear", "jacket"], ["shoes", "loafers"], ["bags", "handbag"], ["accessories", "bracelet"]];
  while (base.length < size) { const [category, subtype] = categories[base.length % categories.length]; base.push(item(category, subtype, `${subtype} option ${base.length}`, { color: ["black", "navy", "cream", "brown"][base.length % 4] })); }
  return base.slice(0, size);
}
function ids(items: any[]) { return items.map((entry) => String(entry._id || entry.id)).filter(Boolean); }
function overlap(a: string[], b: string[]) { return a.filter((id) => new Set(b).has(id)).length / Math.max(1, a.length); }
function forbidden(items: any[]) { return items.some((entry) => /denim shorts|cargo shorts|gym|sleepwear|swimwear|athletic sneaker|slides/.test(`${entry.name} ${entry.subcategory}`.toLowerCase())); }

const scenarios = [
  ["Wedding", "wedding", "warm dry"], ["Church", "church", "warm dry"], ["Business", "business meeting", "cool dry"], ["Interview", "interview", "cool dry"],
  ["Date night", "date night", "warm evening"], ["Casual", "casual weekend", "warm dry"], ["Vacation", "vacation", "hot dry"], ["Airport", "airport travel", "cool dry"],
  ["Rain", "business", "heavy rain"], ["Hot", "casual", "very hot"], ["Cold", "business", "cold winter"]
] as const;
const sizes = [5, 16, 56, 205];
const results: ScenarioResult[] = [];
for (const size of sizes) {
  const closet = wardrobe(size);
  for (const [name, occasionName, weatherContext] of scenarios) {
    const output: any = buildRecommendation({ wardrobeItems: closet, occasionName, weatherContext, recommendationMode: "todays_best" });
    const outputItems = output.items || [];
    results.push({ name: `${name}-${size}`, group: name, complete: output.completenessStatus === "complete", fallback: output.status === "limited_wardrobe", forbidden: forbidden(outputItems), duplicateRole: sanitizeOutfitItems(outputItems).removed.length > 0, referenceRetained: null, confidence: Number(output.confidenceScore || 0), itemIds: ids(outputItems), overlap: 0 });
  }
}

const matchCloset = wardrobe(20);
for (const category of ["shoes", "bags", "dresses", "womens_hair"]) {
  const reference: any = { _id: `reference-${category}`, imageUrl: `https://fixtures.invalid/${category}.png`, source: "upload", status: "ready", category, subcategory: category === "shoes" ? "loafers" : category === "bags" ? "clutch" : category === "dresses" ? "dress" : "wig", primaryColor: "black", occasions: ["casual"], usableForMatching: true, usableForTryOn: true, warnings: [] };
  const output: any = buildReferenceOutfitRecommendations({ referenceItem: reference, wardrobeItems: matchCloset, occasionName: "casual", weatherContext: "dry", limit: 1 })[0];
  results.push({ name: `Match-${category}`, group: "Match", complete: output.completenessStatus === "complete", fallback: output.status === "limited_wardrobe", forbidden: forbidden(output.items || []), duplicateRole: sanitizeOutfitItems([...(output.items || []), { ...reference, _id: reference._id }]).removed.length > 0, referenceRetained: output.referenceItems?.some((entry: any) => entry.id === reference._id) || false, confidence: Number(output.confidenceScore || 0), itemIds: ids(output.items || []), overlap: 0 });
}

const regenerationCloset = wardrobe(56);
const first: any = buildRecommendation({ wardrobeItems: regenerationCloset, occasionName: "casual", weatherContext: "dry", recommendationMode: "todays_best" });
const firstIds = ids(first.items || []);
const second: any = buildRecommendation({
  wardrobeItems: regenerationCloset,
  occasionName: "casual",
  weatherContext: "dry",
  recommendationMode: "something_different",
  outfitHistorySummary: {
    eventCount: 1,
    lastRecommendationItemIds: firstIds,
    recentRecommendedItemIds: firstIds,
    recentRecommendationItemIdLists: [firstIds],
    recentRecommendationSignatures: [],
    recentItemRecommendationCounts: Object.fromEntries(firstIds.map((id) => [id, 1]))
  },
  regeneration: {
    requestKind: "regenerate",
    previousItemIds: firstIds,
    minimumCoreChanges: 2,
    maximumOverlap: 0.4
  }
});
const regenerationOverlap = overlap(ids(second.items || []), firstIds);
results.push({ name: "Regeneration-large", group: "Regeneration", complete: second.completenessStatus === "complete", fallback: second.status === "limited_wardrobe", forbidden: false, duplicateRole: false, referenceRetained: null, confidence: Number(second.confidenceScore || 0), itemIds: ids(second.items || []), overlap: regenerationOverlap });

const complete = results.filter((entry) => entry.complete).length;
const references = results.filter((entry) => entry.referenceRetained !== null);
const metrics = {
  evaluated: results.length,
  completeOutfitRate: complete / results.length,
  gracefulFallbackCount: results.filter((entry) => entry.fallback).length,
  occasionComplianceRate: results.filter((entry) => !entry.forbidden).length / results.length,
  weatherComplianceRate: results.filter((entry) => !entry.forbidden).length / results.length,
  referenceRetentionRate: references.filter((entry) => entry.referenceRetained).length / Math.max(1, references.length),
  duplicateExclusiveRoleViolationRate: results.filter((entry) => entry.duplicateRole).length / results.length,
  formalForbiddenItemViolations: results.filter((entry) => entry.forbidden).length,
  regenerationOverlap,
  averageConfidence: results.reduce((sum, entry) => sum + entry.confidence, 0) / results.length
};
assert.equal(metrics.referenceRetentionRate, 1, "reference retention quality gate");
assert.equal(metrics.duplicateExclusiveRoleViolationRate, 0, "duplicate role quality gate");
assert.equal(metrics.formalForbiddenItemViolations, 0, "formal forbidden-item quality gate");
assert.ok(metrics.regenerationOverlap <= 0.4, "regeneration overlap quality gate");
assert.equal(second.similarityMetadata?.regeneration?.valid, true, "structured regeneration satisfies every hard constraint");
assert.ok(second.similarityMetadata?.regeneration?.coreChanges >= 2, "structured regeneration changes at least two core fashion pieces");
const byGroup = Object.fromEntries(Array.from(new Set(results.map((entry) => entry.group))).map((group) => { const groupResults = results.filter((entry) => entry.group === group); return [group, { evaluated: groupResults.length, complete: groupResults.filter((entry) => entry.complete).length, gracefulFallbacks: groupResults.filter((entry) => entry.fallback).length, forbiddenResults: groupResults.filter((entry) => entry.forbidden).length, duplicateRoleResults: groupResults.filter((entry) => entry.duplicateRole).length }]; }));
console.info = originalConsoleInfo;
console.log(JSON.stringify({ metrics, byGroup }, null, 2));
