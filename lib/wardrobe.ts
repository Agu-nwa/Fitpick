import mongoose from "mongoose";
import type { WardrobeCategory } from "@/types/wardrobe";
import { normaliseWardrobeItemMetadata } from "@/lib/wardrobe/metadata-normaliser";
import { getProtectedStorageUrl } from "@/lib/storage/url";

export function isObjectId(value: string) {
  return mongoose.Types.ObjectId.isValid(value);
}

export function inferCondition(input: {
  category?: string;
  color?: string;
  fit?: string;
  occasions?: string[];
  condition?: "ready" | "needs-care" | "missing-tags";
}) {
  if (input.condition === "needs-care") return "needs-care";

  const hasCoreDetails = Boolean(input.category && input.color);
  const hasSimplifiedUploadEssentials = hasCoreDetails && Boolean(input.fit?.trim());
  const hasLegacyEssentials = hasCoreDetails && Boolean(input.occasions?.length);
  const hasMinimumTags = hasSimplifiedUploadEssentials || hasLegacyEssentials;
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

function preferredOriginalWardrobeImage(images: any = {}, fallback = "") {
  const front = images.front || {};
  const back = images.back || {};
  return (
    imageVariantUrl(front, "original") ||
    front.url ||
    imageVariantUrl(back, "original") ||
    back.url ||
    fallback
  );
}

function protectImageVariant(variant: any) {
  if (!variant || typeof variant !== "object") return variant;
  return {
    ...variant,
    url: variant.storageKey ? getProtectedStorageUrl(variant.storageKey) : variant.url || ""
  };
}

function protectImageAsset(asset: any) {
  if (!asset || typeof asset !== "object") return asset;
  return {
    ...asset,
    url: asset.storageKey ? getProtectedStorageUrl(asset.storageKey) : asset.url || "",
    ...(asset.variants ? {
      variants: {
        ...asset.variants,
        original: protectImageVariant(asset.variants.original),
        thumbnail: protectImageVariant(asset.variants.thumbnail)
      }
    } : {})
  };
}

function protectWardrobeImages(images: any = {}) {
  return {
    ...images,
    front: protectImageAsset(images.front),
    back: protectImageAsset(images.back),
    fabricCloseUp: protectImageAsset(images.fabricCloseUp),
    label: protectImageAsset(images.label),
    additional: Array.isArray(images.additional) ? images.additional.map(protectImageAsset) : []
  };
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
  const images = protectWardrobeImages(item.images || {});
  const protectedRootUrl = item.storageKey ? getProtectedStorageUrl(item.storageKey) : item.imageUrl || "";
  const imageUrl = preferredOriginalWardrobeImage(images, protectedRootUrl);
  const normalisedMetadata = normaliseWardrobeItemMetadata(item);
  const condition = inferCondition({
    category: item.category,
    color: item.color,
    fit: item.fit || item.garmentFit,
    occasions: item.occasions,
    condition: item.condition
  });

  return {
    id: String(item._id),
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory || "",
    canonicalSubtype: item.canonicalSubtype || "",
    structureRole: item.structureRole || "unknown",
    stylingRole: item.stylingRole || "unknown",
    setComponents: item.setComponents || [],
    visibilityRole: item.visibilityRole || "unknown",
    occasionRange: item.occasionRange || [],
    formalityLevel: item.formalityLevel || "",
    taxonomyConfidence: typeof item.taxonomyConfidence === "number" ? item.taxonomyConfidence : 0,
    taxonomyEvidence: item.taxonomyEvidence || [],
    taxonomyNeedsReview: item.taxonomyNeedsReview !== false,
    taxonomyStatus: item.taxonomyStatus || (item.taxonomyNeedsReview === false ? "confirmed" : item.canonicalSubtype ? "needs_review" : "unresolved"),
    taxonomyConfirmedBy: item.taxonomyConfirmedBy || "system",
    taxonomyConfirmedAt: item.taxonomyConfirmedAt ? new Date(item.taxonomyConfirmedAt).toISOString() : null,
    taxonomyConflicts: item.taxonomyConflicts || [],
    neckline: item.neckline || "unknown",
    accessoryScale: item.accessoryScale || "unknown",
    waistbandType: item.waistbandType || "unknown",
    beltCompatible: typeof item.beltCompatible === "boolean" ? item.beltCompatible : null,
    cuffType: item.cuffType || "unknown",
    supportsPocketSquare: typeof item.supportsPocketSquare === "boolean" ? item.supportsPocketSquare : null,
    hasLapel: typeof item.hasLapel === "boolean" ? item.hasLapel : null,
    garmentLength: item.garmentLength || "unknown",
    footwearAttributes: item.footwearAttributes || {},
    metadataSources: item.metadataSources || {},
    taxonomyVersion: item.taxonomyVersion || "",
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
    normalisedMetadata,
    enrichmentStatus: item.enrichmentStatus || "not_started",
    verifiedMetadata: item.verifiedMetadata || {},
    condition,
    timesWorn: item.timesWorn || 0,
    recommendationCount: item.recommendationCount || 0,
    lastRecommendedAt: item.lastRecommendedAt ? new Date(item.lastRecommendedAt).toISOString() : null,
    favoriteScore: typeof item.favoriteScore === "number" ? item.favoriteScore : 0,
    versatilityScore: typeof item.versatilityScore === "number" ? item.versatilityScore : 0,
    confidenceScore: typeof item.confidenceScore === "number" ? item.confidenceScore : 0,
    lastWornAt: item.lastWornAt ? new Date(item.lastWornAt).toISOString() : null,
    archivedAt: item.archivedAt ? new Date(item.archivedAt).toISOString() : null,
    imageUrl,
    thumbnailUrl: preferredWardrobeImage(images, item.storageKey ? protectedRootUrl : item.thumbnailUrl || imageUrl),
    images,
    aiAnalysis: item.aiAnalysis || null,
    hasImage: Boolean(item.storageKey || item.thumbnailUrl || imageUrl),
    recognizedEntity: recognizedEntityFromItem(item)
  };
}

/**
 * Compact representation for the closet grid. Item detail and review routes
 * continue to use serializeWardrobeItem so editing and AI/audit metadata are
 * never lost; the list only sends fields its cards, filters, and review badge
 * consume.
 */
export function serializeWardrobeListItem(item: any) {
  const images = protectWardrobeImages(item.images || {});
  const protectedRootUrl = item.storageKey ? getProtectedStorageUrl(item.storageKey) : item.imageUrl || "";
  const imageUrl = preferredOriginalWardrobeImage(images, protectedRootUrl);
  const condition = inferCondition({
    category: item.category,
    color: item.color,
    fit: item.fit || item.garmentFit,
    occasions: item.occasions,
    condition: item.condition
  });

  return {
    id: String(item._id),
    createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).toISOString() : null,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory || "",
    canonicalSubtype: item.canonicalSubtype || "",
    structureRole: item.structureRole || "unknown",
    stylingRole: item.stylingRole || "unknown",
    setComponents: item.setComponents || [],
    visibilityRole: item.visibilityRole || "unknown",
    formalityLevel: item.formalityLevel || "",
    taxonomyNeedsReview: item.taxonomyNeedsReview !== false,
    taxonomyStatus: item.taxonomyStatus || (item.taxonomyNeedsReview === false ? "confirmed" : item.canonicalSubtype ? "needs_review" : "unresolved"),
    taxonomyConflicts: item.taxonomyConflicts || [],
    color: item.color || "",
    occasions: item.occasions || [],
    weather: item.weather || [],
    userInputMetadata: item.userInputMetadata || {},
    categorySpecificMetadata: item.categorySpecificMetadata || {},
    recommendationMetadata: item.recommendationMetadata || {},
    searchMetadata: item.searchMetadata || {},
    verifiedMetadata: item.verifiedMetadata || {},
    condition,
    timesWorn: item.timesWorn || 0,
    lastWornAt: item.lastWornAt ? new Date(item.lastWornAt).toISOString() : null,
    imageUrl,
    thumbnailUrl: preferredWardrobeImage(images, item.storageKey ? protectedRootUrl : item.thumbnailUrl || imageUrl),
    hasImage: Boolean(item.storageKey || item.thumbnailUrl || imageUrl)
  };
}

export function serializeWardrobeUpload(upload: any) {
  const images = protectWardrobeImages(upload.images || {});
  const protectedRootUrl = upload.storageKey ? getProtectedStorageUrl(upload.storageKey) : upload.imageUrl || "";
  return {
    id: String(upload._id),
    filename: upload.filename || "",
    mimeType: upload.mimeType || "",
    sizeBytes: upload.sizeBytes || 0,
    width: upload.width || 0,
    height: upload.height || 0,
    sourceImageHash: upload.sourceImageHash || "",
    perceptualImageHash: upload.perceptualImageHash || "",
    batchId: upload.batchId ? String(upload.batchId) : null,
    batchPosition: typeof upload.batchPosition === "number" ? upload.batchPosition : null,
    uploadStatus: upload.uploadStatus,
    aiTagStatus: upload.aiTagStatus,
    aiProvider: upload.aiProvider || "",
    aiConfidence: upload.aiConfidence || 0,
    aiErrorSafeMessage: upload.aiErrorSafeMessage || "",
    imageUrl: protectedRootUrl,
    thumbnailUrl: upload.storageKey ? protectedRootUrl : upload.thumbnailUrl || "",
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
    images,
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
  const conditions = items.map((item) => inferCondition({
    category: item.category,
    color: item.color,
    fit: item.fit || item.garmentFit,
    occasions: item.occasions,
    condition: item.condition
  }));

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
    readyCount: conditions.filter((condition) => condition === "ready").length,
    needsCareCount: conditions.filter((condition) => condition === "needs-care").length,
    missingTagsCount: conditions.filter((condition) => condition === "missing-tags").length,
    countsByCategory,
    missingEssentials: required
      .filter((essential) => !countsByCategory[essential.key])
      .map((essential) => essential.label)
  };
}
