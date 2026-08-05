import assert from "node:assert/strict";
import {
  clearReferenceFashionItem,
  expireStaleReferenceFashionItems,
  markReferenceItemConvertedToWardrobe,
  markReferenceItemsLinkedToOutfit,
  markReferenceItemsSavedWithOutfit,
  manualReferenceSelectionPatch,
  referenceItemToPseudoWardrobeItem,
  referenceItemToWardrobeAiAnalysis,
  serializeReferenceFashionItem
} from "../lib/ai/reference-fashion-item";
import { buildReferenceOutfitRecommendations } from "../lib/recommendation/reference-matching";
import { buildOutfitPresentationItems } from "../lib/recommendation/outfit-presentation";

function field(value: unknown, confidence = 0.92, source = "user_confirmed") {
  return { value, confidence, source };
}

function wardrobeItem(id: string, category: string, name: string, color: string, patch: Record<string, unknown> = {}) {
  return {
    _id: id,
    id,
    userId: "00000000000000000000face",
    name,
    category,
    subcategory: category,
    color,
    pattern: "solid",
    fabric: "cotton blend",
    fit: "regular",
    condition: "ready",
    occasions: ["dinner", "smart casual", "weekend"],
    weather: ["dry", "cool"],
    verifiedMetadata: {
      primaryColor: field(color),
      fabricEstimate: field("cotton blend"),
      fit: field("regular"),
      occasionSuitability: field(["dinner", "smart casual", "weekend"]),
      weatherSuitability: field(["dry", "cool"]),
      formalityScore: field(["balanced", "polished"])
    },
    ...patch
  };
}

const referenceItem = {
  _id: "100000000000000000000001",
  userId: "00000000000000000000face",
  conversationId: "stylist-test",
  imageUrl: "https://assets.myfitpick.test/reference/red-jacket.jpg",
  storageKey: "wardrobe/00000000000000000000face/reference/red-jacket.jpg",
  source: "upload",
  status: "ready",
  category: "outerwear",
  subcategory: "leather jacket",
  primaryColor: "red",
  secondaryColors: ["black"],
  pattern: "solid",
  fabric: "leather",
  silhouette: "cropped jacket",
  fit: "regular",
  formality: "smart casual",
  styles: ["polished"],
  occasions: ["dinner", "date night"],
  weather: ["cool", "dry"],
  seasons: ["autumn"],
  detectedItems: [
    {
      id: "item-1",
      label: "red leather jacket",
      category: "outerwear",
      subcategory: "leather jacket",
      primaryColor: "red",
      confidence: 0.9
    }
  ],
  imageQuality: {
    itemVisible: true,
    lighting: "good",
    blur: "none",
    occlusion: "none",
    usableForMatching: true,
    usableForTryOn: true
  },
  usableForMatching: true,
  usableForTryOn: true,
  warnings: [],
  analysisSummary: "A red leather jacket that can anchor polished casual outfits."
};

const wardrobe = [
  wardrobeItem("200000000000000000000001", "tops", "White tee", "white"),
  wardrobeItem("200000000000000000000002", "bottoms", "Black jeans", "black"),
  wardrobeItem("200000000000000000000003", "shoes", "Black loafers", "black", {
    fabric: "leather",
    verifiedMetadata: {
      primaryColor: field("black"),
      fabricEstimate: field("leather"),
      fit: field("true to size"),
      occasionSuitability: field(["dinner", "smart casual", "date night"]),
      weatherSuitability: field(["dry", "cool"]),
      formalityScore: field(["polished"])
    }
  }),
  wardrobeItem("200000000000000000000004", "bags", "Black evening clutch", "black", {
    subcategory: "Clutch",
    fabric: "leather",
    verifiedMetadata: {
      primaryColor: field("black"),
      fabricEstimate: field("leather"),
      fit: field("structured"),
      occasionSuitability: field(["dinner", "date night", "smart casual"]),
      weatherSuitability: field(["dry", "cool"]),
      formalityScore: field(["polished"])
    }
  }),
  wardrobeItem("200000000000000000000005", "accessories", "Silver wristwatch", "silver", {
    subcategory: "Watches",
    fabric: "stainless steel",
    verifiedMetadata: {
      primaryColor: field("silver"),
      fabricEstimate: field("stainless steel"),
      fit: field("regular"),
      occasionSuitability: field(["dinner", "date night", "smart casual"]),
      weatherSuitability: field(["dry", "cool"]),
      formalityScore: field(["polished"])
    }
  })
];

const pseudo = referenceItemToPseudoWardrobeItem(referenceItem);
assert.equal(pseudo.recommendationMetadata.source, "reference-upload");
assert.equal(pseudo.imageUrl, referenceItem.imageUrl);
assert.equal(pseudo.category, "outerwear");

const serialized = serializeReferenceFashionItem(referenceItem);
assert.equal(serialized?.id, referenceItem._id);
assert.equal(serialized?.status, "ready");
assert.ok(!("storageKey" in (serialized || {})), "public reference serialization must not expose storage keys");

const manualFallback = manualReferenceSelectionPatch("provider_unavailable");
assert.equal(manualFallback.status, "needs-selection", "provider failure offers manual selection without requiring re-upload");
assert.equal(manualFallback.manualSelectionRequired, true);
assert.ok(manualFallback.detectedItems.some((entry) => entry.category === "shoes"), "manual fallback supports a footwear anchor");
assert.ok(manualFallback.detectedItems.some((entry) => entry.category === "bags"), "manual fallback supports a bag anchor");
assert.ok(manualFallback.detectedItems.some((entry) => entry.category === "accessories"), "manual fallback supports an accessory anchor");
assert.ok(manualFallback.detectedItems.some((entry) => entry.category === "native"), "manual fallback supports native wear");
assert.ok(manualFallback.detectedItems.some((entry) => entry.category === "womens_hair"), "manual fallback supports women's hair anchors");

const analysis = referenceItemToWardrobeAiAnalysis(referenceItem);
assert.equal(analysis.fields.category.value, "outerwear");
assert.equal(analysis.fields.primaryColor.value, "red");
assert.equal(analysis.fields.fabricEstimate.value, "leather");

const recommendations = buildReferenceOutfitRecommendations({
  referenceItem,
  wardrobeItems: wardrobe,
  message: "Style this for dinner",
  occasionName: "dinner",
  weatherContext: "cool dry evening",
  limit: 2
});

assert.ok(recommendations.length >= 1, "photo anchor should produce recommendations when closet has matching pieces");
const first = recommendations[0];
assert.ok(first.items.length >= 3, "photo anchor outfit should include supporting wardrobe items");
assert.ok(first.items.every((item: any) => wardrobe.some((owned) => String(owned._id) === String(item._id))), "recommendation items must remain saved wardrobe items only");
assert.ok(first.items.some((item: any) => item.category === "bags"), "photo match should complete the look with an owned bag when suitable");
assert.ok(first.items.some((item: any) => /watch/i.test(`${item.name} ${item.subcategory}`)), "photo match should include the strongest owned wrist accessory when suitable");
assert.ok(first.items.filter((item: any) => /watch|smartwatch/i.test(`${item.name} ${item.subcategory}`)).length <= 1, "photo match should keep one watch");
assert.ok(first.items.filter((item: any) => /bracelet|bangle|cuff/i.test(`${item.name} ${item.subcategory}`)).length <= 1, "photo match should treat wrist jewelry separately from watches");
assert.equal(first.similarityMetadata?.outfitTemplateId, "casual");
assert.equal(first.similarityMetadata?.occasionProfileId, "dinner");
assert.ok(first.similarityMetadata?.editorialReview, "photo match should include deterministic editorial ranking metadata");
assert.equal(first.scoreBreakdown?.stylingValidation?.valid, true);
assert.ok(first.scoreBreakdown?.confidenceEngine?.overallConfidence >= 0, "photo match should include internal confidence scoring");
assert.ok(first.scoreBreakdown?.explainability, "photo match should include internal explainability metadata");
assert.equal(first.scoreBreakdown?.collectionFamily, "Date Night Collection");
assert.ok(first.outfitPieces.some((piece: any) => piece.source === "reference-upload" && piece.referenceItemId === referenceItem._id), "outfit pieces must include the uploaded reference source");
assert.ok(first.outfitPieces.some((piece: any) => piece.source === "wardrobe" && piece.wardrobeItemId), "outfit pieces must include saved wardrobe sources");
assert.equal(first.referenceItems[0]?.id, referenceItem._id);
assert.equal(first.similarityMetadata?.source, "reference-upload");

const variedWardrobe = [
  ...wardrobe,
  wardrobeItem("200000000000000000000006", "tops", "Powder blue blouse", "blue"),
  wardrobeItem("200000000000000000000007", "tops", "Cream silk shirt", "cream"),
  wardrobeItem("200000000000000000000008", "bottoms", "Navy tailored trousers", "navy"),
  wardrobeItem("200000000000000000000009", "bottoms", "Stone midi skirt", "stone"),
  wardrobeItem("200000000000000000000010", "shoes", "Brown block heels", "brown"),
  wardrobeItem("200000000000000000000011", "shoes", "Nude pumps", "nude"),
  wardrobeItem("200000000000000000000012", "bags", "Tan structured bag", "tan", { subcategory: "Handbag" }),
  wardrobeItem("200000000000000000000013", "accessories", "Gold necklace", "gold", { subcategory: "Necklace" })
];
const variedMatches = buildReferenceOutfitRecommendations({
  referenceItem,
  wardrobeItems: variedWardrobe,
  message: "Style this for dinner",
  occasionName: "dinner",
  weatherContext: "cool dry evening",
  limit: 3
});
assert.ok(variedMatches.length >= 2, "photo matching should return multiple alternatives when the closet supports them");
const variedOverlap = variedMatches[0].items.filter((item: any) => variedMatches[1].items.some((other: any) => String(other._id) === String(item._id))).length /
  Math.max(variedMatches[0].items.length, variedMatches[1].items.length);
assert.ok(variedOverlap <= 0.5, "photo-match alternatives must remain materially different after accessory completion");

const previousMatchIds = variedMatches[0].items.map((item: any) => String(item._id));
const regeneratedMatch = buildReferenceOutfitRecommendations({
  referenceItem,
  wardrobeItems: variedWardrobe,
  message: "Create a fresh alternative",
  occasionName: "dinner",
  weatherContext: "cool dry evening",
  recommendationMode: "something_different",
  regeneration: {
    requestKind: "regenerate",
    previousItemIds: previousMatchIds,
    minimumCoreChanges: 2,
    maximumOverlap: 0.35
  },
  outfitHistorySummary: {
    eventCount: 1,
    recentRecommendationItemIdLists: [previousMatchIds],
    lastRecommendationItemIds: previousMatchIds,
    recentRecommendedItemIds: previousMatchIds,
    recentItemRecommendationCounts: Object.fromEntries(previousMatchIds.map((id: string) => [id, 1]))
  },
  limit: 3
})[0];
assert.ok(regeneratedMatch, "photo-match regeneration should find a replacement when alternatives exist");
assert.equal(regeneratedMatch.similarityMetadata?.regeneration?.valid, true, "photo-match regeneration must satisfy the final hard diversity policy");
assert.ok(regeneratedMatch.similarityMetadata?.regeneration?.coreChanges >= 2, "photo-match regeneration must change at least two supporting core garments");
assert.ok(regeneratedMatch.similarityMetadata?.regeneration?.overlap <= 0.35, "photo-match regeneration must enforce overlap after completion");

const shoeReference = {
  ...referenceItem,
  _id: "100000000000000000000002",
  category: "shoes",
  subcategory: "sneakers",
  primaryColor: "black",
  occasions: ["casual"]
};
const shoeMatch = buildReferenceOutfitRecommendations({
  referenceItem: shoeReference,
  wardrobeItems: wardrobe,
  occasionName: "casual",
  weatherContext: "dry",
  limit: 1
})[0];
assert.ok(shoeMatch.items.some((item: any) => item.category === "tops"), "shoe anchor should add an owned top");
assert.ok(shoeMatch.items.some((item: any) => item.category === "bottoms"), "shoe anchor should add an owned bottom");
assert.equal(shoeMatch.items.some((item: any) => item.category === "shoes"), false, "shoe anchor must not add duplicate owned footwear");
assert.equal(shoeMatch.completenessStatus, "complete", "reference footwear should satisfy outfit completeness");
const shoePresentation = buildOutfitPresentationItems(shoeMatch as any, shoeMatch.referenceItems[0] as any);
assert.equal(shoePresentation[0]?.source, "reference-upload", "the uploaded footwear anchor must lead the presented recommendation");
assert.equal(shoePresentation[0]?.id, shoeReference._id, "the presented upload must be the selected reference anchor");
assert.equal(shoePresentation.filter((item) => item.source === "reference-upload").length, 1, "the uploaded anchor must not be duplicated in the presentation");
assert.ok(shoePresentation.slice(1).every((item) => item.source === "wardrobe"), "supporting presentation pieces must remain owned wardrobe items");

const bagReference = {
  ...referenceItem,
  _id: "100000000000000000000003",
  category: "bags",
  subcategory: "Clutch",
  primaryColor: "black"
};
const bagMatch = buildReferenceOutfitRecommendations({
  referenceItem: bagReference,
  wardrobeItems: wardrobe,
  occasionName: "dinner",
  weatherContext: "dry",
  limit: 1
})[0];
assert.equal(bagMatch.items.some((item: any) => item.category === "bags"), false, "bag anchor must lock the carry role and prevent a competing closet bag");
assert.equal(bagMatch.referenceItems[0]?.id, bagReference._id, "bag anchor remains attached to the recommendation");

const watchReference = {
  ...referenceItem,
  _id: "100000000000000000000004",
  category: "accessories",
  subcategory: "Watches",
  primaryColor: "silver"
};
const watchMatch = buildReferenceOutfitRecommendations({
  referenceItem: watchReference,
  wardrobeItems: wardrobe,
  occasionName: "dinner",
  weatherContext: "dry",
  limit: 1
})[0];
assert.equal(watchMatch.items.some((item: any) => /watch/i.test(`${item.name} ${item.subcategory}`)), false, "watch anchor must lock the watch role and prevent a competing closet watch");
assert.equal(watchMatch.referenceItems[0]?.id, watchReference._id, "watch anchor remains attached to the recommendation");
assert.equal(typeof markReferenceItemsLinkedToOutfit, "function", "reference items must link to generated outfit records");
assert.equal(typeof markReferenceItemsSavedWithOutfit, "function", "saved looks must preserve temporary reference metadata");
assert.equal(typeof markReferenceItemConvertedToWardrobe, "function", "explicit closet conversion must mark reference records");
assert.equal(typeof clearReferenceFashionItem, "function", "clearing a reference must be lifecycle-aware");
assert.equal(typeof expireStaleReferenceFashionItems, "function", "abandoned temporary references must have cleanup support");

console.log("Stylist reference item checks passed.");
