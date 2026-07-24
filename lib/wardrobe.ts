import mongoose from "mongoose";
import type { WardrobeCategory } from "@/types/wardrobe";

export function isObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

export function inferCondition(input: {
  category?: string;
  color?: string;
  occasions?: string[];
  condition?: "ready" | "needs-care" | "missing-tags";
}) {
  if (input.condition === "needs-care") return "needs-care";
  if (input.condition === "missing-tags") return "missing-tags";

  const hasMinimumTags = Boolean(input.category && input.color && input.occasions?.length);
  return hasMinimumTags ? "ready" : "missing-tags";
}

function imageVariantUrl(image: any, variant: "thumbnail" | "original") {
  const selected = image?.variants?.[variant];
  return selected?.status === "ready" && selected?.url ? selected.url : "";
}

function preferredWardrobeImage(images: any = {}, fallback = "") {
  const front = images.front || {};
  const back = images.back || {};
  return (
    imageVariantUrl(front, "thumbnail") ||
    imageVariantUrl(front, "original") ||
    front.url ||
    imageVariantUrl(back, "thumbnail") ||
    imageVariantUrl(back, "original") ||
    back.url ||
    fallback
  );
}

function recognizedEntityFromItem(item: any) {
  return (
    item.verifiedMetadata?.recognizedEntity?.value ||
    item.aiAnalysis?.fields?.recognizedEntity?.value ||
    item.verifiedMetadata?.eventRelevance?.value ||
    ""
  );
}

export function serializeWardrobeItem(item: any) {
  const imageUrl = preferredWardrobeImage(item.images || {}, item.imageUrl || "");
  return {
    id: String(item._id),
    name: item.name,
    category: item.category,
    subcategory: item.subcategory || "",
    color: item.color || "",
    pattern: item.pattern || "",
    fabric: item.fabric || "",
    fit: item.fit || "",
    taggedSize: item.taggedSize || "unknown",
    sizeSystem: item.sizeSystem || "unknown",
    garmentFit: item.garmentFit || "unknown",
    garmentMeasurements: item.garmentMeasurements || {},
    stretchLevel: item.stretchLevel || "unknown",
    fabricDrape: item.fabricDrape || "unknown",
    fitConfidence: typeof item.fitConfidence === "number" ? item.fitConfidence : 0,
    measurementSource: item.measurementSource || "unknown",
    formality: item.formality || [],
    occasions: item.occasions || [],
    weather: item.weather || [],
    userInputMetadata: item.userInputMetadata || {},
    categorySpecificMetadata: item.categorySpecificMetadata || {},
    ocrMetadata: item.ocrMetadata || {},
    recommendationMetadata: item.recommendationMetadata || {},
    virtualTryOnMetadata: item.virtualTryOnMetadata || {},
    searchMetadata: item.searchMetadata || {},
    enrichmentStatus: item.enrichmentStatus || "not_started",
    verifiedMetadata: item.verifiedMetadata || {},
    condition: item.condition,
    timesWorn: item.timesWorn || 0,
    recommendationCount: item.recommendationCount || 0,
    lastRecommendedAt: item.lastRecommendedAt ? new Date(item.lastRecommendedAt).toISOString() : null,
    favoriteScore: typeof item.favoriteScore === "number" ? item.favoriteScore : 0,
    versatilityScore: typeof item.versatilityScore === "number" ? item.versatilityScore : 0,
    confidenceScore: typeof item.confidenceScore === "number" ? item.confidenceScore : 0,
    lastWornAt: item.lastWornAt ? new Date(item.lastWornAt).toISOString() : null,
    archivedAt: item.archivedAt ? new Date(item.archivedAt).toISOString() : null,
    imageUrl,
    thumbnailUrl: preferredWardrobeImage(item.images || {}, item.thumbnailUrl || imageUrl),
    images: item.images || {},
    aiAnalysis: item.aiAnalysis || null,
    hasImage: Boolean(item.storageKey || item.thumbnailUrl || imageUrl),
    recognizedEntity: recognizedEntityFromItem(item)
  };
}

export function serializeWardrobeUpload(upload: any) {
  return {
    id: String(upload._id),
    filename: upload.filename || "",
    mimeType: upload.mimeType || "",
    sizeBytes: upload.sizeBytes || 0,
    width: upload.width || 0,
    height: upload.height || 0,
    uploadStatus: upload.uploadStatus,
    aiTagStatus: upload.aiTagStatus,
    aiProvider: upload.aiProvider || "",
    aiConfidence: upload.aiConfidence || 0,
    aiErrorSafeMessage: upload.aiErrorSafeMessage || "",
    imageUrl: upload.imageUrl || "",
    thumbnailUrl: upload.thumbnailUrl || "",
    selectedCategory: upload.selectedCategory || "",
    selectedCategoryLabel: upload.selectedCategoryLabel || "",
    intakeCategoryId: upload.intakeCategoryId || "",
    intakeGroup: upload.intakeGroup || "",
    userInputMetadata: upload.userInputMetadata || {},
    categorySpecificMetadata: upload.categorySpecificMetadata || {},
    ocrMetadata: upload.ocrMetadata || {},
    labelPhotoKinds: upload.labelPhotoKinds || [],
    recommendationMetadata: upload.recommendationMetadata || {},
    virtualTryOnMetadata: upload.virtualTryOnMetadata || {},
    searchMetadata: upload.searchMetadata || {},
    enrichmentStatus: upload.enrichmentStatus || "not_started",
    images: upload.images || {},
    aiAnalysis: upload.aiAnalysis || null,
    suggestedTags: upload.suggestedTags || {},
    taggedSize: upload.taggedSize || "unknown",
    sizeSystem: upload.sizeSystem || "unknown",
    garmentFit: upload.garmentFit || "unknown",
    garmentMeasurements: upload.garmentMeasurements || {},
    stretchLevel: upload.stretchLevel || "unknown",
    fabricDrape: upload.fabricDrape || "unknown",
    fitConfidence: typeof upload.fitConfidence === "number" ? upload.fitConfidence : 0,
    measurementSource: upload.measurementSource || "unknown",
    reviewedAt: upload.reviewedAt ? new Date(upload.reviewedAt).toISOString() : null,
    createdItemId: upload.createdItemId ? String(upload.createdItemId) : null
  };
}

export function wardrobeSummary(items: any[]) {
  const countsByCategory: Record<string, number> = {};

  for (const item of items) {
    countsByCategory[item.category] = (countsByCategory[item.category] || 0) + 1;
  }

  const required: Array<{ key: WardrobeCategory; label: string }> = [
    { key: "tops", label: "Add tops to build everyday outfits." },
    { key: "bottoms", label: "Add bottoms to complete outfit combinations." },
    { key: "shoes", label: "Add shoes for stronger recommendations." },
    { key: "outerwear", label: "Add outerwear for weather and layering options." },
    { key: "accessories", label: "Add accessories for polished finish options." }
  ];

  return {
    totalCount: items.length,
    readyCount: items.filter((item) => item.condition === "ready").length,
    needsCareCount: items.filter((item) => item.condition === "needs-care").length,
    missingTagsCount: items.filter((item) => item.condition === "missing-tags").length,
    countsByCategory,
    missingEssentials: required
      .filter((essential) => !countsByCategory[essential.key])
      .map((essential) => essential.label)
  };
}
