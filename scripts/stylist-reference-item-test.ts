import assert from "node:assert/strict";
import {
  clearReferenceFashionItem,
  expireStaleReferenceFashionItems,
  markReferenceItemConvertedToWardrobe,
  markReferenceItemsLinkedToOutfit,
  markReferenceItemsSavedWithOutfit,
  referenceItemToPseudoWardrobeItem,
  referenceItemToWardrobeAiAnalysis,
  serializeReferenceFashionItem
} from "../lib/ai/reference-fashion-item";
import { buildReferenceOutfitRecommendations } from "../lib/recommendation/reference-matching";

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
assert.ok(first.outfitPieces.some((piece: any) => piece.source === "reference-upload" && piece.referenceItemId === referenceItem._id), "outfit pieces must include the uploaded reference source");
assert.ok(first.outfitPieces.some((piece: any) => piece.source === "wardrobe" && piece.wardrobeItemId), "outfit pieces must include saved wardrobe sources");
assert.equal(first.referenceItems[0]?.id, referenceItem._id);
assert.equal(first.similarityMetadata?.source, "reference-upload");
assert.equal(typeof markReferenceItemsLinkedToOutfit, "function", "reference items must link to generated outfit records");
assert.equal(typeof markReferenceItemsSavedWithOutfit, "function", "saved looks must preserve temporary reference metadata");
assert.equal(typeof markReferenceItemConvertedToWardrobe, "function", "explicit closet conversion must mark reference records");
assert.equal(typeof clearReferenceFashionItem, "function", "clearing a reference must be lifecycle-aware");
assert.equal(typeof expireStaleReferenceFashionItems, "function", "abandoned temporary references must have cleanup support");

console.log("Stylist reference item checks passed.");
