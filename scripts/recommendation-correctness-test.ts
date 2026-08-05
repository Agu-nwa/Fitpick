import assert from "node:assert/strict";
import { evaluateOutfitCompleteness } from "../lib/recommendation/completeness";
import { completeFootwear } from "../lib/recommendation/footwear-completion";
import { accessoryRoleFor, selectAccessoryCompletion, validateAccessoryRoles } from "../lib/recommendation/accessory-completion";
import { inferAccessoryTaxonomy } from "../lib/wardrobe/accessory-taxonomy";
import { sanitizeOutfitItems } from "../lib/recommendation/outfit-slots";
import { validateRecommendationCandidate } from "../lib/recommendation/candidate-validator";
import { occasionProfiles } from "../lib/recommendation/occasion-profiles";
import { outfitTemplates } from "../lib/recommendation/outfit-templates";
import { diversifyOutfits } from "../lib/recommendation/diversity";
import { evaluateRegenerationCandidate, resolveRegenerationPolicy } from "../lib/recommendation/regeneration";
import { wardrobeRotationScore } from "../lib/recommendation/rotation";

const item = (id: string, category: string, name: string, extra: Record<string, any> = {}) => ({ _id: id, category, name, condition: "ready", ...extra });
const top = item("top", "tops", "White shirt", { canonicalSubtype: "shirt", taxonomyNeedsReview: false });
const bottom = item("bottom", "bottoms", "Black trousers", { canonicalSubtype: "trousers", taxonomyNeedsReview: false });
const dress = item("dress", "dresses", "Blue midi dress", { canonicalSubtype: "dress", taxonomyNeedsReview: false });
const shoe = item("shoe", "shoes", "Black loafers", { canonicalSubtype: "loafers", taxonomyNeedsReview: false });
const nativeOnePiece = item("native-one", "native", "Cream kaftan", { canonicalSubtype: "kaftan", taxonomyNeedsReview: false });
const nativeTop = item("native-top", "native", "Buba", { canonicalSubtype: "buba", taxonomyNeedsReview: false });
const nativeBottom = item("native-bottom", "native", "Wrapper", { canonicalSubtype: "wrapper", taxonomyNeedsReview: false });

assert.equal(evaluateOutfitCompleteness([dress, shoe], { allowedStructures: ["dress_one_piece"] }).completenessStatus, "complete", "9 dress plus shoes is complete");
assert.equal(evaluateOutfitCompleteness([top, bottom, shoe], { allowedStructures: ["top_bottom"] }).completenessStatus, "complete", "10 top bottom shoes is complete");
assert.equal(evaluateOutfitCompleteness([nativeOnePiece, shoe], { allowedStructures: ["native_one_piece"] }).completenessStatus, "complete", "11 native one-piece plus shoes is complete");
assert.equal(evaluateOutfitCompleteness([nativeTop, nativeBottom, shoe], { allowedStructures: ["native_separates"] }).completenessStatus, "complete", "12 native separates plus shoes are complete");
assert.equal(evaluateOutfitCompleteness([dress, shoe], { allowedStructures: ["dress_one_piece", "top_bottom"] }).satisfiedStructure, "dress_one_piece", "13 alternatives do not require contradictory categories");
assert.equal(sanitizeOutfitItems([top, bottom, dress, shoe]).items.some((entry) => entry._id === "top"), false, "14 contradictory structures normalize to one-piece");

assert.equal(completeFootwear({ selectedItems: [top, bottom, shoe], allWardrobeItems: [shoe] }).state, "footwear_selected", "1 existing shoe is preserved");
const manyShoes = Array.from({ length: 12 }, (_, index) => item(`shoe-${index}`, "shoes", `Owned shoe ${index}`, { canonicalSubtype: "loafers", taxonomyNeedsReview: false, lastWornAt: index < 11 ? new Date().toISOString() : undefined }));
const outsideTen = completeFootwear({ selectedItems: [top, bottom], allWardrobeItems: manyShoes, occasion: "Business" });
assert.equal(outsideTen.candidateCount, 12, "2 every shoe is considered outside the former first ten");
assert.equal(outsideTen.state, "footwear_rescued", "5 missing footwear is rescued");
assert.ok(outsideTen.diagnostics.every((entry) => entry.selected || entry.rejectionCode), "31 every omitted shoe has a reason");
const sparseShoe = item("sparse", "shoes", "Pair", { canonicalSubtype: "other_footwear", taxonomyNeedsReview: false });
assert.equal(completeFootwear({ selectedItems: [top, bottom], allWardrobeItems: [sparseShoe] }).state, "footwear_rescued", "3 sparse shoe metadata remains eligible");
assert.equal(completeFootwear({ selectedItems: [top, bottom], allWardrobeItems: [item("misnamed", "shoes", "Sunday pair")] }).state, "footwear_rescued", "4 category identifies misnamed footwear");
assert.equal(completeFootwear({ selectedItems: [top, bottom], allWardrobeItems: [] }).state, "no_owned_footwear", "6 no footwear is explicit");
const incompatible = item("rain-only", "shoes", "Rain boot", { weather: ["rain"] });
assert.equal(completeFootwear({ selectedItems: [top, bottom], allWardrobeItems: [incompatible], weather: "hot dry" }).state, "footwear_available_but_incompatible", "7 explicit incompatibility is reported");
assert.ok(!evaluateOutfitCompleteness([top, bottom], { footwearState: "footwear_available_but_incompatible" }).completenessWarnings.join(" ").includes("No shoes found"), "8 warning never claims owned shoes do not exist");

const necklace = item("necklace", "accessories", "Necklace", { canonicalSubtype: "necklace", stylingRole: "neck_jewelry", taxonomyNeedsReview: false });
const earrings = item("earrings", "accessories", "Earrings", { canonicalSubtype: "earrings", stylingRole: "ear_jewelry", taxonomyNeedsReview: false });
const ring = item("ring", "accessories", "Ring", { canonicalSubtype: "ring", stylingRole: "hand_jewelry", taxonomyNeedsReview: false });
const watch = item("watch", "accessories", "Watch", { canonicalSubtype: "watch", stylingRole: "watch", taxonomyNeedsReview: false });
const bracelet = item("bracelet", "accessories", "Subtle bracelet", { canonicalSubtype: "bracelet", stylingRole: "wrist_jewelry", taxonomyNeedsReview: false });
assert.equal(accessoryRoleFor(necklace), "neck_jewelry", "15 canonical necklace role");
assert.notEqual(accessoryRoleFor(earrings), accessoryRoleFor(ring), "16 earrings and ring have distinct roles");
assert.notEqual(accessoryRoleFor(watch), accessoryRoleFor(bracelet), "17 watch and bracelet are distinct");
assert.equal(validateAccessoryRoles([watch, { ...watch, _id: "watch-2" }]).valid, false, "18 two watches are rejected");
assert.equal(validateAccessoryRoles([bracelet, { ...bracelet, _id: "bracelet-2" }]).valid, false, "19 excessive wrist stacking is rejected");
assert.equal(validateAccessoryRoles([watch, bracelet]).valid, true, "20 watch and one restrained bracelet can coexist");
assert.equal(accessoryRoleFor(item("belt", "accessories", "Leather belt")), "waist", "21 belt maps to waist");
assert.equal(accessoryRoleFor(item("cufflinks", "accessories", "Silver cufflinks")), "formal_detail", "22 cufflinks map to formal detail");
assert.equal(inferAccessoryTaxonomy(item("generic", "accessories", "Gold Jewelry", { subcategory: "Jewelry" })).needsReview, true, "23 generic jewelry remains unresolved");
const pendant = inferAccessoryTaxonomy(item("pendant", "accessories", "Gold pendant necklace"));
assert.equal(pendant.role, "neck_jewelry", "24 pendant necklace is inferred");
assert.ok(pendant.evidence.some((entry) => entry.startsWith("name:")), "24 inference includes evidence");

const businessFinish = selectAccessoryCompletion({ selectedItems: [top, bottom, shoe], wardrobeItems: [watch, bracelet, necklace], occasionName: "Business meeting", formality: "business", repeatDays: 14 });
assert.ok(businessFinish.items.some((entry) => accessoryRoleFor(entry) === "watch"), "26 business finishing prefers an owned watch");
assert.ok(businessFinish.items.length <= 3, "30 casual and general finishing never over-accessorizes");
assert.ok(businessFinish.decision.diagnostics.some((entry) => entry.selected && entry.positiveSignals.length), "33 selected accessories include positive diagnostics");
assert.ok(businessFinish.decision.diagnostics.every((entry) => typeof entry.score === "number"), "25 sparse candidates receive a score rather than automatic rejection");
assert.ok(businessFinish.decision.omitted.every((entry) => Boolean(entry.reason)), "32 rejected accessories have stable reasons");
assert.ok(!/score|points?|\d+\.\d+/.test(businessFinish.decision.reason.toLowerCase()), "34 user-facing reason does not expose internal numeric scores");
assert.notEqual(accessoryRoleFor(item("cap", "accessories", "Street cap")), "other", "28 streetwear cap is recognized");
assert.equal(accessoryRoleFor(item("native-cap", "native", "Traditional cap", { canonicalSubtype: "traditional_cap", taxonomyNeedsReview: false })), "headwear", "29 native headwear is recognized");
assert.notEqual(accessoryRoleFor(earrings), accessoryRoleFor(necklace), "27 dress finishers can occupy distinct alternatives");

const weddingProfile = occasionProfiles.find((profile) => profile.id === "wedding")!;
const weddingShorts = item("wedding-shorts", "bottoms", "Denim shorts", { canonicalSubtype: "shorts", taxonomyNeedsReview: false });
const formalConflict = validateRecommendationCandidate({
  items: [top, weddingShorts, shoe],
  template: outfitTemplates.wedding,
  profile: weddingProfile
});
assert.equal(formalConflict.valid, false, "formal wedding candidates reject clearly casual denim shorts");
assert.ok(formalConflict.warnings.includes("formal_context_casual_item"), "formal conflict remains explainable");
assert.equal(formalConflict.hardFailure, true, "formal occasion conflicts cannot be relaxed for a small wardrobe");
assert.ok(formalConflict.rejectionReasons.includes("occasion_forbidden_subtype"), "formal rejection includes a structured reason");

const formalSneakerConflict = validateRecommendationCandidate({
  items: [top, bottom, item("sports-shoe", "shoes", "Black athletic sneaker")],
  template: outfitTemplates.wedding,
  profile: weddingProfile
});
assert.ok(formalSneakerConflict.rejectionReasons.includes("athletic_footwear_for_formal_event"), "formal events reject athletic footwear explicitly");

const rainSlidesConflict = validateRecommendationCandidate({
  items: [top, bottom, item("slides", "shoes", "Open toe slides")],
  weatherContext: "heavy rain"
});
assert.ok(rainSlidesConflict.rejectionReasons.includes("weather_conflict"), "explicit weather conflicts are rejected");

const different = diversifyOutfits([
  { items: [top, bottom, shoe], score: 100 },
  { items: [top, item("bottom-2", "bottoms", "Navy trousers"), shoe], score: 99 },
  { items: [dress, item("shoe-2", "shoes", "Silver pumps")], score: 94 }
], {
  limit: 1,
  avoidLastOutfit: true,
  maximumLastOutfitOverlap: 0.5,
  historySummary: { eventCount: 1, lastRecommendationItemIds: ["top", "bottom", "shoe"], recentRecommendedItemIds: ["top", "bottom", "shoe"] }
});
assert.equal(different[0].items[0]._id, "dress", "something different selects a materially different architecture when available");

const regenerationWardrobe = [
  top,
  bottom,
  shoe,
  item("blazer", "outerwear", "Red blazer"),
  item("bag", "bags", "Black bag"),
  watch,
  item("new-top", "tops", "Blue shirt"),
  item("new-bottom", "bottoms", "Stone trousers"),
  item("new-shoe", "shoes", "Brown loafers"),
  item("new-bag", "bags", "Tan bag")
];
const regenerationPolicy = resolveRegenerationPolicy({
  requestKind: "regenerate",
  previousItemIds: ["top", "bottom", "shoe", "blazer", "bag", "watch"],
  minimumCoreChanges: 2,
  maximumOverlap: 0.4
}, regenerationWardrobe);
const repeatedEvaluation = evaluateRegenerationCandidate([top, bottom, shoe, item("new-blazer", "outerwear", "Navy blazer"), item("new-bag", "bags", "Tan bag")], regenerationPolicy);
assert.equal(repeatedEvaluation.valid, false, "35 regeneration rejects candidates that retain too many core garments");
assert.ok(repeatedEvaluation.rejectionReasons.includes("insufficient_core_changes"), "36 regeneration reports the hard core-change failure");
const freshEvaluation = evaluateRegenerationCandidate([
  item("new-top", "tops", "Blue shirt"),
  item("new-bottom", "bottoms", "Stone trousers"),
  shoe,
  item("new-blazer", "outerwear", "Navy blazer"),
  item("new-bag", "bags", "Tan bag")
], regenerationPolicy);
assert.equal(freshEvaluation.valid, true, "37 regeneration accepts a materially different complete candidate");
assert.ok(freshEvaluation.overlap <= 0.4, "38 final overlap is measured after finishing items are present");

const prominentRepeatPolicy = resolveRegenerationPolicy({
  requestKind: "regenerate",
  previousItemIds: ["top", "bottom", "shoe", "blazer"],
  minimumCoreChanges: 1,
  maximumOverlap: 0.8
}, regenerationWardrobe, { allowedStructures: ["top_bottom"] });
const repeatedBlazer = evaluateRegenerationCandidate([
  item("new-top", "tops", "Blue shirt"),
  item("new-bottom", "bottoms", "Stone trousers"),
  item("new-shoe", "shoes", "Brown loafers"),
  regenerationWardrobe.find((entry) => entry._id === "blazer")
], prominentRepeatPolicy);
assert.ok(repeatedBlazer.rejectionReasons.includes("prominent_item_repeated"), "39 regeneration does not let the same unlocked blazer occupy the permitted overlap");

const structuralWardrobe = [...regenerationWardrobe, dress, item("dress-shoe", "shoes", "Silver pumps")];
const structurePolicy = resolveRegenerationPolicy({
  requestKind: "regenerate",
  previousItemIds: ["top", "bottom", "shoe"],
  minimumCoreChanges: 1,
  maximumOverlap: 0.8
}, structuralWardrobe, { allowedStructures: ["top_bottom", "dress_one_piece"] });
assert.equal(structurePolicy.requireStructureChange, true, "40 regeneration recognizes an owned alternative outfit architecture");
assert.ok(
  evaluateRegenerationCandidate([item("new-top", "tops", "Blue shirt"), item("new-bottom", "bottoms", "Stone trousers"), item("new-shoe", "shoes", "Brown loafers")], structurePolicy).rejectionReasons.includes("outfit_structure_repeated"),
  "41 regeneration rejects a cosmetic same-structure replacement when a complete alternative architecture exists"
);
assert.equal(evaluateRegenerationCandidate([dress, item("dress-shoe", "shoes", "Silver pumps")], structurePolicy).valid, true, "42 regeneration accepts the complete alternative architecture");

const repeatedBlazerScore = wardrobeRotationScore(
  [regenerationWardrobe.find((entry) => entry._id === "blazer")],
  { eventCount: 3, lastRecommendationItemIds: ["blazer"], recentRecommendedItemIds: ["blazer"], recentItemRecommendationCounts: { blazer: 3 } }
);
const freshBlazerScore = wardrobeRotationScore(
  [item("fresh-blazer", "outerwear", "Navy blazer")],
  { eventCount: 3, lastRecommendationItemIds: ["blazer"], recentRecommendedItemIds: ["blazer"], recentItemRecommendationCounts: { blazer: 3 } }
);
assert.ok(freshBlazerScore > repeatedBlazerScore, "43 prominent consecutive-repeat cooldown materially favors a fresh blazer");

const elasticBottom = item("elastic-bottom", "bottoms", "Elastic waist trousers");
const belt = item("safe-belt", "accessories", "Leather belt", { canonicalSubtype: "belt", stylingRole: "waist", taxonomyNeedsReview: false });
const elasticBeltResult = selectAccessoryCompletion({ selectedItems: [top, elasticBottom, shoe], wardrobeItems: [belt], occasionName: "Business meeting", repeatDays: 14 });
assert.ok(elasticBeltResult.decision.omitted.some((entry) => entry.itemId === "safe-belt" && entry.reason === "structure_conflict"), "44 safe text inference prevents a belt on an explicit elastic waistband");

console.log("Recommendation correctness checks passed.");
