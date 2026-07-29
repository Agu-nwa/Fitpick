import assert from "node:assert/strict";
import { accessoryRoleFor } from "../lib/recommendation/accessory-completion";
import { metadataValue } from "../lib/recommendation/scoring";
import { wardrobeAiAnalysisSchema } from "../lib/ai/schemas/wardrobe-ai.schema";
import { categoryAttributeProfiles } from "../lib/wardrobe/category-attribute-profiles";
import { normaliseWardrobeItemMetadata } from "../lib/wardrobe/metadata-normaliser";
import { sanitizeCategorySpecificMetadata } from "../lib/wardrobe/metadata-validation";

const topSpecific = sanitizeCategorySpecificMetadata({
  sleeveLength: "long",
  neckline: "crew",
  heelHeight: "high"
}, "tops");
assert.deepEqual(topSpecific, { sleeveLength: "long", neckline: "crew" }, "tops should keep top-specific fields only");

const shoeSpecific = sanitizeCategorySpecificMetadata({
  shoeStyle: "Chelsea boot",
  toeShape: "almond",
  collarType: "spread"
}, "shoes");
assert.deepEqual(shoeSpecific, { shoeStyle: "Chelsea boot", toeShape: "almond" }, "shoes should keep shoe-specific fields only");

const bagSpecific = sanitizeCategorySpecificMetadata({
  bagStyle: "tote",
  carryingStyle: ["shoulder", "hand carry"],
  sleeveLength: "short"
}, "bags");
assert.deepEqual(bagSpecific, { bagStyle: "tote", carryingStyle: ["shoulder", "hand carry"] }, "bags should keep bag-specific fields only");

const watchSpecific = sanitizeCategorySpecificMetadata({
  role: "watch",
  metalTone: "silver",
  toeShape: "round"
}, "accessories");
assert.deepEqual(watchSpecific, { role: "watch", metalTone: "silver" }, "accessories should keep a valid accessory role");

const invalidAccessoryRole = sanitizeCategorySpecificMetadata({ role: "wrist sparkle" }, "accessories");
assert.deepEqual(invalidAccessoryRole, { role: "other" }, "unknown accessory roles should normalize to other");

const hairSpecific = sanitizeCategorySpecificMetadata({
  hairType: "wig",
  length: "long",
  protectiveStyle: true,
  heelType: "block"
}, "womens_hair");
assert.deepEqual(hairSpecific, { hairType: "wig", length: "long", protectiveStyle: true }, "women's hair should keep hair-specific fields only");

const legacyItem = {
  category: "shoes",
  subcategory: "Boots",
  color: "Black",
  fabric: "Leather",
  occasions: ["Dinner"],
  weather: ["Rain"]
};
const normalisedLegacy = normaliseWardrobeItemMetadata(legacyItem);
assert.equal(normalisedLegacy.universal.category, "shoes", "legacy category should normalize");
assert.equal(normalisedLegacy.universal.primaryColor, "Black", "legacy color should normalize");
assert.equal(normalisedLegacy.universal.material, "Leather", "legacy fabric should normalize as material");
assert.deepEqual(normalisedLegacy.universal.weatherSuitability, ["Rain"], "legacy weather should normalize");

const structuredItem = {
  category: "accessories",
  subcategory: "Watches",
  color: "Silver",
  categorySpecificMetadata: { inferred: { role: "watch", metalTone: "silver" } }
};
assert.equal(metadataValue(structuredItem, "role"), "watch", "recommendation metadataValue should read inferred category-specific fields");
assert.equal(accessoryRoleFor(structuredItem), "wrist", "watch role should support wrist accessory exclusivity");

const listFields = new Set([
  "secondaryColors",
  "weatherSuitability",
  "seasonSuitability",
  "occasionSuitability",
  "careInstructions",
  "logoDetections",
  "textDetections",
  "brandSignals",
  "entityWarnings",
  "stylingNotes"
]);
const numberFields = new Set(["fitConfidence", "entityConfidence"]);
const fieldShape = wardrobeAiAnalysisSchema.shape.fields.shape;
const fields = Object.fromEntries(
  Object.keys(fieldShape).map((key) => [
    key,
    key === "category"
      ? { value: "shoes", confidence: 0.9, source: "vision" }
      : listFields.has(key)
        ? { value: [], confidence: 0, source: "vision" }
        : numberFields.has(key)
          ? { value: null, confidence: 0, source: "vision" }
          : { value: null, confidence: 0, source: "vision" }
  ])
);

const aiAnalysis = wardrobeAiAnalysisSchema.parse({
  provider: "openai",
  model: "test",
  status: "suggested",
  categorySpecificMetadata: {
    shoeStyle: "loafer",
    toeShape: "almond"
  },
  rawSummary: "Black leather loafers.",
  fields
});
assert.equal(aiAnalysis.categorySpecificMetadata.shoeStyle, "loafer", "AI analysis should accept category-specific metadata");
assert.ok(categoryAttributeProfiles.womens_hair.allowedSpecificFields.includes("hairType"), "women's hair profile should be available inside Closet");

console.log("Wardrobe metadata architecture checks passed.");
