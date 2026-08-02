import assert from "node:assert/strict";
import { getCanonicalSubtypeOptions, isCanonicalTaxonomyComplete, resolveCanonicalTaxonomy } from "../lib/wardrobe/canonical-taxonomy";
import { intakeCategories } from "../lib/wardrobe/category-intelligence";

function resolved(category: string, subcategory: string, patch: Record<string, unknown> = {}) {
  return resolveCanonicalTaxonomy({ category, subcategory, name: subcategory, ...patch });
}

assert.equal(resolved("accessories", "Necklace").stylingRole, "neck_jewelry");
assert.equal(resolved("accessories", "Earrings").stylingRole, "ear_jewelry");
assert.equal(resolved("accessories", "Ring").stylingRole, "hand_jewelry");
assert.notEqual(resolved("accessories", "Bracelet").stylingRole, resolved("accessories", "Watch").stylingRole);
assert.equal(resolved("accessories", "Jewelry").needsReview, true);
assert.equal(resolved("accessories", "Jewelry Set").needsReview, true);

const confirmed = resolved("accessories", "Jewelry", { canonicalSubtype: "necklace", stylingRole: "neck_jewelry", structureRole: "finisher", visibilityRole: "visible_finisher", taxonomyNeedsReview: false, taxonomyConfidence: 1 });
assert.equal(confirmed.source, "confirmed");
assert.equal(confirmed.stylingRole, "neck_jewelry");
assert.equal(isCanonicalTaxonomyComplete({ category: "accessories", canonicalSubtype: "necklace", taxonomyNeedsReview: false }), true);

assert.deepEqual(resolved("outerwear", "Trouser Suit").setComponents, ["top_layer", "bottom"]);
assert.deepEqual(resolved("outerwear", "Three-Piece Suit").setComponents, ["top_layer", "bottom", "waistcoat"]);
assert.equal(resolved("outerwear", "Matching Set").needsReview, true);
assert.equal(resolved("bottoms", "Leggings").structureRole, "bottom");
assert.equal(resolved("outerwear", "Tracksuit").structureRole, "set");
assert.equal(resolved("dresses", "One-Piece Swimsuit").structureRole, "one_piece");
assert.equal(resolved("dresses", "Bikini Set").structureRole, "set");
assert.equal(resolved("outerwear", "Swim Cover-Up").structureRole, "outer_layer");
assert.equal(resolved("dresses", "Sleep Set").structureRole, "set");
assert.equal(resolved("dresses", "Nightdress").structureRole, "one_piece");
assert.equal(resolved("outerwear", "Robe").structureRole, "outer_layer");
assert.equal(resolved("native", "Kaftan").structureRole, "one_piece");
assert.equal(resolved("native", "Wrapper").structureRole, "bottom");
assert.equal(resolved("native", "Traditional Cap").stylingRole, "headwear");
assert.equal(resolved("native", "Agbada").needsReview, true);
assert.equal(resolved("womens_hair", "Wig").structureRole, "hair_piece");
assert.equal(resolved("accessories", "Hair Clip").stylingRole, "hair_accessory");
assert.equal(resolved("bags", "Handbag").visibilityRole, "primary_carry");
assert.equal(resolved("bags", "Wallet").visibilityRole, "small_leather_good");
assert.equal(resolved("bags", "Travel Bag").visibilityRole, "travel_luggage");

for (const subtype of ["slides", "mules", "pumps", "oxfords", "slippers"]) {
  const item = resolved("shoes", subtype);
  assert.equal(item.canonicalSubtype, subtype);
  assert.equal(item.structureRole, "footwear");
}
assert.ok(getCanonicalSubtypeOptions("accessories").some((entry) => entry.value === "necklace"));
assert.equal(intakeCategories.some((entry) => entry.id === "jewelry"), false, "generic Jewelry must not remain a preferred intake option");
assert.ok(intakeCategories.some((entry) => entry.canonicalSubtype === "necklace"), "intake must use canonical necklace option");
assert.ok(intakeCategories.some((entry) => entry.canonicalSubtype === "oxfords"), "intake must expose explicit footwear options");
assert.ok(getCanonicalSubtypeOptions("accessories").some((entry) => entry.needsReview && entry.clarification), "ambiguous subtypes must expose a clarification step");
console.log("Canonical wardrobe taxonomy checks passed.");
