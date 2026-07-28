import assert from "node:assert/strict";
import { buildRecommendation } from "../lib/recommendation/engine";
import { outfitItemSignature } from "../lib/recommendation/history";
import { normalizeOutfitSlot, sanitizeOutfitItems } from "../lib/recommendation/outfit-slots";

function field(value: unknown, confidence = 0.9, source = "user_confirmed") {
  return { value, confidence, source };
}

function item(
  id: string,
  category: string,
  name: string,
  color: string,
  patch: Record<string, unknown> = {}
) {
  return {
    _id: id,
    name,
    category,
    subcategory: category,
    color,
    pattern: "solid",
    fabric: "cotton blend",
    fit: "regular",
    condition: "ready",
    occasions: ["business casual", "casual weekend", "rainy day"],
    formality: ["balanced", "polished"],
    weather: ["dry", "indoor"],
    verifiedMetadata: {
      primaryColor: field(color),
      fabricEstimate: field("cotton blend"),
      fabricComposition: field("cotton blend"),
      fit: field("regular"),
      formalityScore: field(["balanced", "polished"]),
      occasionSuitability: field(["business casual", "casual weekend", "rainy day"]),
      weatherSuitability: field(["dry", "indoor"]),
      luxuryScore: field(0.7)
    },
    ...patch
  };
}

function signature(outfit: { items: Array<{ id?: string; _id?: string }> }) {
  return outfitItemSignature(outfit.items.map((entry) => String(entry.id || entry._id)).filter(Boolean));
}

function slotCount(outfit: { items: any[] }, slot: string) {
  return outfit.items.filter((entry) => normalizeOutfitSlot(entry) === slot).length;
}

const wardrobe = [
  item("000000000000000000000001", "tops", "White oxford shirt", "white", {
    verifiedMetadata: {
      primaryColor: field("white"),
      fabricEstimate: field("cotton poplin"),
      fit: field("tailored"),
      formalityScore: field(["polished", "formal"]),
      occasionSuitability: field(["business casual", "work", "church"]),
      weatherSuitability: field(["dry", "indoor"]),
      luxuryScore: field(0.8)
    }
  }),
  item("000000000000000000000002", "bottoms", "Navy tailored trouser", "navy", {
    fit: "tailored",
    verifiedMetadata: {
      primaryColor: field("navy"),
      fabricEstimate: field("wool blend"),
      fit: field("tailored"),
      formalityScore: field(["polished", "formal"]),
      occasionSuitability: field(["business casual", "work", "church"]),
      weatherSuitability: field(["dry", "indoor", "cool"]),
      luxuryScore: field(0.9)
    }
  }),
  item("000000000000000000000003", "shoes", "Black leather loafers", "black", {
    verifiedMetadata: {
      primaryColor: field("black"),
      fabricEstimate: field("leather"),
      fit: field("true to size"),
      formalityScore: field(["polished", "formal"]),
      occasionSuitability: field(["business casual", "work", "date night", "church"]),
      weatherSuitability: field(["dry", "indoor"]),
      luxuryScore: field(0.85)
    }
  }),
  item("000000000000000000000004", "tops", "Charcoal knit polo", "charcoal", {
    verifiedMetadata: {
      primaryColor: field("charcoal"),
      fabricEstimate: field("soft knit"),
      fit: field("relaxed"),
      formalityScore: field(["balanced", "smart casual"]),
      occasionSuitability: field(["casual weekend", "smart casual", "travel"]),
      weatherSuitability: field(["dry", "cool"]),
      luxuryScore: field(0.6)
    }
  }),
  item("000000000000000000000005", "bottoms", "Stone chinos", "stone", {
    verifiedMetadata: {
      primaryColor: field("stone"),
      fabricEstimate: field("cotton twill"),
      fit: field("regular"),
      formalityScore: field(["balanced", "smart casual"]),
      occasionSuitability: field(["casual weekend", "smart casual", "travel"]),
      weatherSuitability: field(["dry", "warm"]),
      luxuryScore: field(0.55)
    }
  }),
  item("000000000000000000000006", "shoes", "Clean white sneakers", "white", {
    verifiedMetadata: {
      primaryColor: field("white"),
      fabricEstimate: field("leather"),
      fit: field("comfortable"),
      formalityScore: field(["relaxed", "balanced"]),
      occasionSuitability: field(["casual weekend", "travel", "smart casual"]),
      weatherSuitability: field(["dry", "warm"]),
      luxuryScore: field(0.5)
    }
  }),
  item("000000000000000000000007", "outerwear", "Olive rain jacket", "olive", {
    weather: ["rain", "wind", "cool"],
    verifiedMetadata: {
      primaryColor: field("olive"),
      fabricEstimate: field("water resistant nylon"),
      fit: field("regular"),
      formalityScore: field(["relaxed", "balanced"]),
      occasionSuitability: field(["rainy day", "travel", "casual weekend"]),
      weatherSuitability: field(["rain", "wind", "cool"]),
      luxuryScore: field(0.45)
    }
  }),
  item("000000000000000000000008", "bags", "Black leather tote", "black", {
    subcategory: "Tote",
    fabric: "leather",
    verifiedMetadata: {
      primaryColor: field("black"),
      fabricEstimate: field("leather"),
      fit: field("structured"),
      formalityScore: field(["polished", "formal"]),
      occasionSuitability: field(["business casual", "work", "church", "dinner"]),
      weatherSuitability: field(["dry", "indoor"]),
      luxuryScore: field(0.82)
    }
  }),
  item("000000000000000000000009", "accessories", "Silver dress watch", "silver", {
    subcategory: "Watches",
    fabric: "stainless steel",
    verifiedMetadata: {
      primaryColor: field("silver"),
      fabricEstimate: field("stainless steel"),
      fit: field("regular"),
      formalityScore: field(["polished", "formal"]),
      occasionSuitability: field(["business casual", "work", "church", "dinner"]),
      weatherSuitability: field(["dry", "indoor"]),
      luxuryScore: field(0.86)
    }
  }),
  item("000000000000000000000010", "accessories", "Gold bracelet", "gold", {
    subcategory: "Jewelry",
    fabric: "gold tone",
    verifiedMetadata: {
      primaryColor: field("gold"),
      fabricEstimate: field("gold tone"),
      fit: field("regular"),
      formalityScore: field(["polished"]),
      occasionSuitability: field(["dinner", "date night"]),
      weatherSuitability: field(["dry", "indoor"]),
      luxuryScore: field(0.7)
    }
  })
];

const businessLook = buildRecommendation({
  wardrobeItems: wardrobe,
  occasionName: "business casual",
  formality: "polished",
  recommendationMode: "business_ready",
  styleProfile: {
    favoriteColors: ["navy", "white", "black"],
    dislikedColors: ["orange"],
    preferredFits: ["tailored"],
    fashionRiskLevel: "balanced",
    comfortPriority: "medium",
    luxuryPreference: "high"
  }
});

assert.equal(businessLook.recommendationMode, "business_ready");
assert.ok(businessLook.items.length >= 3, "business casual recommendation should include owned core items");
assert.ok(businessLook.items.every((entry: any) => wardrobe.some((owned) => String(owned._id) === String(entry.id || entry._id))), "recommendation must only use fixture-owned items");
assert.equal(businessLook.scoreBreakdown?.version, "stylist-score-v5");
assert.equal(businessLook.similarityMetadata?.outfitTemplateId, "business_casual");
assert.equal(businessLook.similarityMetadata?.occasionProfileId, "business");
assert.equal(businessLook.scoreBreakdown?.stylingValidation?.valid, true);
assert.ok(businessLook.freshnessCue, "recommendation should explain freshness in user-safe language");
assert.ok(businessLook.items.some((entry: any) => entry.category === "bags"), "business recommendation should complete the look with an owned bag when suitable");
assert.ok(businessLook.items.some((entry: any) => /watch/i.test(`${entry.name} ${entry.subcategory}`)), "business recommendation should include the strongest owned wrist accessory when suitable");
assert.ok(businessLook.items.filter((entry: any) => /watch|bracelet|smartwatch/i.test(`${entry.name} ${entry.subcategory}`)).length <= 1, "recommendation should avoid conflicting wrist accessories");

const priorSignature = signature(businessLook as any);
const differentLook = buildRecommendation({
  wardrobeItems: wardrobe,
  occasionName: "smart casual",
  recommendationMode: "something_different",
  outfitHistorySummary: {
    eventCount: 3,
    recentRecommendationSignatures: [priorSignature],
    recentlyWornSignatures: [],
    recentRecommendedItemIds: businessLook.items.map((entry: any) => String(entry.id || entry._id)),
    recentlyWornItemIds: []
  }
});

assert.notEqual(signature(differentLook as any), priorSignature, "something_different should avoid exact recent outfits when viable alternatives exist");
assert.ok(differentLook.similarityMetadata?.editorialReview, "regenerated recommendations should carry editorial ranking metadata");

const smallWardrobeLook = buildRecommendation({
  wardrobeItems: wardrobe.slice(0, 2),
  occasionName: "casual weekend",
  recommendationMode: "todays_best"
});

assert.equal(smallWardrobeLook.completenessStatus, "missing_footwear");
assert.match(smallWardrobeLook.summary, /currently have 2 closet items/i);
assert.ok(smallWardrobeLook.gapInsights.length, "small wardrobe recommendations should include gap insight language");

const rainyLook = buildRecommendation({
  wardrobeItems: wardrobe,
  occasionName: "rainy day",
  weatherContext: "rain expected",
  recommendationMode: "rain_ready",
  weather: { condition: "Rain", rainChance: 85, temperature: 22 }
});

assert.ok(rainyLook.items.some((entry: any) => entry.category === "outerwear"), "rain-ready recommendation should include owned weather outerwear when available");

const brunchWardrobe = [
  item("000000000000000000000051", "dresses", "Cream midi dress", "cream", {
    verifiedMetadata: {
      primaryColor: field("cream"),
      fabricEstimate: field("linen blend"),
      fit: field("regular"),
      formalityScore: field(["balanced", "polished"]),
      occasionSuitability: field(["brunch", "dinner", "date night"]),
      weatherSuitability: field(["dry", "warm"]),
      luxuryScore: field(0.72)
    }
  }),
  item("000000000000000000000052", "shoes", "Nude block heels", "nude", {
    subcategory: "Heels",
    verifiedMetadata: {
      primaryColor: field("nude"),
      fabricEstimate: field("leather"),
      fit: field("regular"),
      formalityScore: field(["polished"]),
      occasionSuitability: field(["brunch", "dinner", "date night"]),
      weatherSuitability: field(["dry", "warm"]),
      luxuryScore: field(0.68)
    }
  }),
  item("000000000000000000000053", "bags", "Taupe shoulder bag", "taupe", {
    subcategory: "Shoulder Bag",
    verifiedMetadata: {
      primaryColor: field("taupe"),
      fabricEstimate: field("leather"),
      fit: field("structured"),
      formalityScore: field(["balanced", "polished"]),
      occasionSuitability: field(["brunch", "dinner"]),
      weatherSuitability: field(["dry", "warm"]),
      luxuryScore: field(0.7)
    }
  }),
  item("000000000000000000000054", "womens_hair", "Soft wave wig", "black", {
    subcategory: "Women's Hair",
    verifiedMetadata: {
      primaryColor: field("black"),
      fit: field("regular"),
      formalityScore: field(["balanced", "polished"]),
      occasionSuitability: field(["brunch", "dinner", "date night"]),
      weatherSuitability: field(["dry", "warm"]),
      luxuryScore: field(0.6)
    }
  }),
  item("000000000000000000000055", "accessories", "Pearl necklace", "pearl", {
    subcategory: "Jewelry",
    verifiedMetadata: {
      primaryColor: field("pearl"),
      fit: field("regular"),
      formalityScore: field(["polished"]),
      occasionSuitability: field(["brunch", "dinner", "date night"]),
      weatherSuitability: field(["dry", "warm"]),
      luxuryScore: field(0.75)
    }
  })
];

const brunchLook = buildRecommendation({
  wardrobeItems: brunchWardrobe,
  occasionName: "brunch",
  formality: "polished",
  styleProfile: {
    genderPresentation: "feminine",
    styleWords: ["elegant"],
    fashionRiskLevel: "balanced"
  }
});

assert.equal(brunchLook.similarityMetadata?.outfitTemplateId, "female_brunch");
assert.ok(brunchLook.items.some((entry: any) => entry.category === "womens_hair"), "women's hair should be selected only as an optional styling enhancement when suitable");
assert.ok(brunchLook.items.every((entry: any) => brunchWardrobe.some((owned) => String(owned._id) === String(entry.id || entry._id))), "women's hair recommendation must still use owned wardrobe IDs only");

const streetwearLook = buildRecommendation({
  wardrobeItems: [
    item("000000000000000000000061", "tops", "Oversized graphic tee", "black", { fit: "oversized" }),
    item("000000000000000000000062", "bottoms", "Olive cargo pants", "olive", { subcategory: "Cargo" }),
    item("000000000000000000000063", "shoes", "Chunky sneakers", "white", { subcategory: "Sneakers" }),
    item("000000000000000000000064", "bags", "Black crossbody bag", "black", { subcategory: "Crossbody" }),
    item("000000000000000000000065", "accessories", "Black cap", "black", { subcategory: "Cap" })
  ],
  occasionName: "streetwear weekend",
  recommendationMode: "statement_look"
});

assert.equal(streetwearLook.similarityMetadata?.outfitTemplateId, "streetwear");
assert.equal(streetwearLook.similarityMetadata?.occasionProfileId, "everyday");
assert.ok(streetwearLook.items.some((entry: any) => /crossbody/i.test(`${entry.name} ${entry.subcategory}`)), "streetwear should include a carry accessory when suitable");

const duplicateBottomWardrobe = [
  item("000000000000000000000011", "shirts", "White dress shirt", "white"),
  item("000000000000000000000012", "shorts", "Tailored navy shorts", "navy"),
  item("000000000000000000000013", "trousers", "Grey formal trouser", "grey"),
  item("000000000000000000000014", "sneakers", "White sneakers", "white"),
  item("000000000000000000000015", "loafers", "Black loafers", "black")
];

const noDuplicateBottomLook = buildRecommendation({
  wardrobeItems: duplicateBottomWardrobe,
  occasionName: "polished work look",
  recommendationMode: "business_ready"
});

assert.ok(slotCount(noDuplicateBottomLook as any, "bottom") <= 1, "recommendation must select only one bottom slot");
assert.ok(slotCount(noDuplicateBottomLook as any, "shoes") <= 1, "recommendation must select only one shoes slot");

const onePieceLook = buildRecommendation({
  wardrobeItems: [
    item("000000000000000000000021", "native", "Cream kaftan", "cream"),
    item("000000000000000000000022", "trousers", "Black trouser", "black"),
    item("000000000000000000000023", "loafers", "Black loafers", "black")
  ],
  occasionName: "formal dinner",
  recommendationMode: "event_ready"
});

assert.ok(slotCount(onePieceLook as any, "onePiece") <= 1, "recommendation must select at most one one-piece item");
if (slotCount(onePieceLook as any, "onePiece") > 0) {
  assert.equal(slotCount(onePieceLook as any, "bottom"), 0, "one-piece recommendation must not add a separate bottom");
}

const layeredLook = buildRecommendation({
  wardrobeItems: [
    item("000000000000000000000031", "shirts", "Blue shirt", "blue"),
    item("000000000000000000000032", "jeans", "Dark jeans", "indigo"),
    item("000000000000000000000033", "jacket", "Camel jacket", "camel"),
    item("000000000000000000000034", "boots", "Brown boots", "brown")
  ],
  occasionName: "smart casual",
  recommendationMode: "todays_best"
});

assert.ok(slotCount(layeredLook as any, "top") <= 1, "layering should not duplicate the top slot");
assert.ok(slotCount(layeredLook as any, "outerwear") <= 1, "layering should allow only one outerwear item");

const sanitizedDuplicateSlots = sanitizeOutfitItems([
  item("000000000000000000000041", "shorts", "Shorts", "navy"),
  item("000000000000000000000042", "pants", "Pants", "black"),
  item("000000000000000000000043", "boots", "Boots", "black"),
  item("000000000000000000000044", "sneakers", "Sneakers", "white")
]);

assert.equal(slotCount({ items: sanitizedDuplicateSlots.items }, "bottom"), 1, "sanitizer must keep one bottom");
assert.equal(slotCount({ items: sanitizedDuplicateSlots.items }, "shoes"), 1, "sanitizer must keep one pair of shoes");
assert.ok(sanitizedDuplicateSlots.removed.length >= 2, "sanitizer should report removed duplicate slots");

console.log("Recommendation engine checks passed.");
