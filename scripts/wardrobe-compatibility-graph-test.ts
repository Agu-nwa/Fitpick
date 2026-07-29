import assert from "node:assert/strict";
import { wardrobeAiAnalysisSchema } from "../lib/ai/schemas/wardrobe-ai.schema";
import {
  analyseColourValue,
  analyseMaterialValue,
  buildCompatibilityEdgesForItem,
  buildImageQualityIntelligence,
  detectLikelyDuplicate,
  normalizeBrandSignal,
  scoreCompatibilityGraph
} from "../lib/wardrobe/compatibility/compatibility-graph";

const navy = analyseColourValue("Navy blue");
assert.equal(navy.family, "blue", "navy should map to the blue family");
assert.equal(navy.shade, "navy blue", "specific shade should be preserved");

const patentLeather = analyseMaterialValue("Black patent leather");
assert.equal(patentLeather.family, "leather", "patent leather should map to leather family");
assert.ok(patentLeather.confidence >= 0.8, "known material should have useful confidence");

const acceptedBrand = normalizeBrandSignal({ value: "Nike", confidence: 0.86 });
assert.equal(acceptedBrand.status, "accepted", "high-confidence brand should be accepted");
const rejectedBrand = normalizeBrandSignal({ value: "Maybe Chanel", confidence: 0.42 });
assert.equal(rejectedBrand.value, "", "low-confidence brand must not be accepted");

const imageIntelligence = buildImageQualityIntelligence({
  images: {
    front: {
      url: "https://cdn.example.com/front.jpg",
      storageKey: "front.jpg",
      provider: "s3",
      purpose: "front",
      variants: {
        original: { width: 640, height: 780, bytes: 58_000 }
      }
    },
    label: {
      url: "https://cdn.example.com/label.jpg",
      storageKey: "label.jpg",
      provider: "s3",
      purpose: "label",
      variants: {
        original: { width: 1200, height: 900, bytes: 400_000 }
      }
    }
  }
});
assert.equal(imageIntelligence.imageQuality.lowResolution, true, "low-resolution uploads should be flagged");
assert.equal(imageIntelligence.garmentVisibility.frontVisible, true, "front photo should mark front visibility");
assert.equal(imageIntelligence.garmentVisibility.backVisible, false, "missing back photo should be visible as a warning signal");

const existingItem = {
  _id: "64f000000000000000000002",
  name: "Navy Oxford Shirt",
  category: "tops",
  subcategory: "shirt",
  color: "navy blue",
  pattern: "solid",
  fabric: "cotton",
  verifiedMetadata: { brand: { value: "Uniqlo" }, silhouette: { value: "regular" } }
};
const duplicate = detectLikelyDuplicate({
  candidate: {
    name: "Navy cotton shirt",
    category: "tops",
    subcategory: "shirt",
    color: "navy",
    pattern: "solid",
    fabric: "cotton",
    verifiedMetadata: { brand: { value: "Uniqlo" }, silhouette: { value: "regular" } }
  },
  existingItems: [existingItem]
});
assert.equal(duplicate.status, "likely_duplicate", "matching wardrobe evidence should flag a likely duplicate");
assert.equal(duplicate.likelyDuplicateItemId, existingItem._id, "duplicate result should reference the likely item");

const shoe = {
  _id: "64f000000000000000000003",
  category: "shoes",
  subcategory: "loafers",
  color: "black",
  fabric: "leather",
  occasions: ["work", "dinner"],
  weather: ["mild"]
};
const edges = buildCompatibilityEdgesForItem({
  userId: "64f000000000000000000001",
  item: existingItem,
  wardrobeItems: [shoe]
});
assert.equal(edges.length, 2, "graph builder should create directional edges");
assert.ok(edges[0].relationshipTypes.includes("colour_harmony"), "edge should include colour relationship evidence");

const graphScore = scoreCompatibilityGraph([existingItem, shoe], edges);
assert.ok(graphScore.edgeCount >= 2, "graph score should use relevant edges");
assert.ok(graphScore.averageCompatibility > 0, "graph score should expose average compatibility");

const fieldShape = wardrobeAiAnalysisSchema.shape.fields.shape;
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
const fields = Object.fromEntries(
  Object.keys(fieldShape).map((key) => [
    key,
    key === "category"
      ? { value: "tops", confidence: 1, source: "vision" }
      : listFields.has(key)
        ? { value: [], confidence: 0, source: "vision" }
        : numberFields.has(key)
          ? { value: null, confidence: 0, source: "vision" }
          : { value: null, confidence: 0, source: "vision" }
  ])
);

const parsedAnalysis = wardrobeAiAnalysisSchema.parse({
  provider: "openai",
  model: "test",
  status: "suggested",
  rawSummary: "Navy shirt.",
  categorySpecificMetadata: {},
  uploadIntelligence: imageIntelligence,
  fields
});
assert.equal(parsedAnalysis.uploadIntelligence?.imageQuality.lowResolution, true, "AI schema should preserve upload intelligence");

console.log("Wardrobe compatibility graph and upload intelligence checks passed.");
