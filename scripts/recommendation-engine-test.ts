import assert from "node:assert/strict";
import { buildRecommendation } from "../lib/recommendation/engine";
import { outfitItemSignature } from "../lib/recommendation/history";

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
assert.equal(businessLook.scoreBreakdown?.version, "stylist-score-v2");
assert.ok(businessLook.freshnessCue, "recommendation should explain freshness in user-safe language");

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

console.log("Recommendation engine checks passed.");
