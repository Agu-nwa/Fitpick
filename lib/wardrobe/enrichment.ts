import { WardrobeItem } from "@/models/WardrobeItem";

function cleanToken(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(cleanToken).filter(Boolean) : [];
}

function fieldValue(item: any, key: string) {
  return item.verifiedMetadata?.[key]?.value ?? item.aiAnalysis?.fields?.[key]?.value ?? item[key] ?? "";
}

function unique(values: unknown[]) {
  return Array.from(new Set(values.map(cleanToken).filter(Boolean))).slice(0, 80);
}

export function buildWardrobeSearchMetadata(item: any) {
  const tokens = unique([
    item.name,
    item.category,
    item.subcategory,
    item.color,
    item.pattern,
    item.fabric,
    item.fit,
    fieldValue(item, "brand"),
    fieldValue(item, "recognizedEntity"),
    fieldValue(item, "fabricComposition"),
    ...list(item.occasions),
    ...list(item.weather),
    ...list(item.formality),
    ...list(item.verifiedMetadata?.secondaryColors?.value),
    ...list(item.verifiedMetadata?.seasonSuitability?.value),
    ...list(item.verifiedMetadata?.stylingNotes?.value)
  ]);

  return {
    version: "wardrobe-search-v1",
    tokens,
    searchableText: tokens.join(" "),
    embeddingStatus: "not_started",
    updatedAt: new Date().toISOString()
  };
}

export function buildRecommendationMetadata(item: any) {
  const category = cleanToken(item.category);
  return {
    version: "recommendation-metadata-v1",
    baseCategory: category,
    outfitRole: category === "shoes" ? "footwear" : category === "bags" || category === "accessories" ? "finisher" : "garment",
    colors: unique([item.color, ...list(item.verifiedMetadata?.secondaryColors?.value)]),
    occasions: unique([...(item.occasions || []), ...list(item.verifiedMetadata?.occasionSuitability?.value)]),
    weather: unique([...(item.weather || []), ...list(item.verifiedMetadata?.weatherSuitability?.value)]),
    formality: unique(item.formality || []),
    material: cleanToken(item.fabric || fieldValue(item, "fabricComposition") || fieldValue(item, "fabricEstimate")),
    updatedAt: new Date().toISOString()
  };
}

export function buildVirtualTryOnMetadata(item: any) {
  const category = cleanToken(item.category);
  return {
    version: "virtual-tryon-metadata-v1",
    eligible: ["tops", "bottoms", "dresses", "outerwear", "shoes"].includes(category),
    preferredImagePurpose: item.images?.front?.url ? "front" : "original",
    hasLabelOnlyImage: Boolean(item.images?.label?.url) && !item.images?.front?.url,
    needsGarmentCutout: Boolean(item.images?.front?.url),
    fitLockedMeasurementKeys: Object.keys(item.garmentMeasurements || {}).filter((key) => item.garmentMeasurements?.[key] != null),
    updatedAt: new Date().toISOString()
  };
}

export function buildPackingMetadata(item: any) {
  return {
    version: "packing-metadata-v1",
    tags: unique([item.category, item.subcategory, ...(item.weather || []), ...(item.occasions || [])]),
    weatherReady: Boolean((item.weather || []).length),
    occasionReady: Boolean((item.occasions || []).length),
    updatedAt: new Date().toISOString()
  };
}

export async function runWardrobeEnrichmentJob(input: { userId: string; wardrobeItemId: string }) {
  const item = await WardrobeItem.findOne({ _id: input.wardrobeItemId, userId: input.userId });
  if (!item) throw new Error("Wardrobe item was not found.");

  const searchMetadata = buildWardrobeSearchMetadata(item);
  const recommendationMetadata = buildRecommendationMetadata(item);
  const virtualTryOnMetadata = buildVirtualTryOnMetadata(item);
  const packingMetadata = buildPackingMetadata(item);

  item.searchMetadata = searchMetadata;
  item.recommendationMetadata = {
    ...(item.recommendationMetadata || {}),
    ...recommendationMetadata,
    packing: packingMetadata
  };
  item.virtualTryOnMetadata = virtualTryOnMetadata;
  item.enrichmentStatus = "completed";
  await item.save();

  return {
    wardrobeItemId: String(item._id),
    searchTokens: searchMetadata.tokens.length,
    outfitRole: recommendationMetadata.outfitRole,
    tryOnEligible: virtualTryOnMetadata.eligible
  };
}
