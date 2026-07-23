export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import {
  logReferenceItemEvent,
  referenceItemToWardrobeAiAnalysis,
  serializeReferenceFashionItem
} from "@/lib/ai/reference-fashion-item";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId, serializeWardrobeUpload } from "@/lib/wardrobe";
import { categoryFromBackend } from "@/lib/wardrobe/category-intelligence";
import { ReferenceFashionItem } from "@/models/ReferenceFashionItem";
import { WardrobeUpload } from "@/models/WardrobeUpload";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function safeFilename(referenceItem: any) {
  const label = [
    referenceItem.primaryColor,
    referenceItem.subcategory || referenceItem.category,
    "reference"
  ].filter(Boolean).join("-") || "myfitpick-reference";
  return `${label.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90)}.jpg`;
}

function suggestedTags(referenceItem: any) {
  return {
    name: [
      referenceItem.primaryColor,
      referenceItem.subcategory || referenceItem.category
    ].filter(Boolean).join(" ").trim() || "Uploaded fashion item",
    category: referenceItem.category || undefined,
    subcategory: referenceItem.subcategory || "",
    color: referenceItem.primaryColor || "",
    pattern: referenceItem.pattern || "",
    fabric: referenceItem.fabric || "",
    fit: referenceItem.fit || "",
    formality: referenceItem.formality ? [referenceItem.formality] : [],
    occasions: referenceItem.occasions || [],
    weather: referenceItem.weather || [],
    confidence: referenceItem.usableForMatching ? 0.84 : 0.55,
    needsReview: true
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-reference:add-to-closet:${meta.ip}`, limit: 12, windowMs: 60 * 1000, operation: "stylist-reference-add-to-closet" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "That photo is no longer available.");

    const referenceItem = await ReferenceFashionItem.findOne({ _id: id, userId: auth.user._id });
    if (!referenceItem) return apiError("NOT_FOUND", "That photo is no longer available.");
    if (referenceItem.status === "needs-selection") return apiError("BAD_REQUEST", "Choose the item you want to add first.");
    if (referenceItem.status !== "ready" || !referenceItem.usableForMatching) {
      return apiError("BAD_REQUEST", "I couldn’t identify a clear fashion item. Try another photo.");
    }

    if (referenceItem.convertedWardrobeUploadId) {
      const existing = await WardrobeUpload.findOne({ _id: referenceItem.convertedWardrobeUploadId, userId: auth.user._id });
      if (existing) {
        return apiSuccess({
          referenceItem: serializeReferenceFashionItem(referenceItem),
          upload: serializeWardrobeUpload(existing),
          nextAction: `/wardrobe/${String(existing._id)}/confirm`
        }, { message: "Ready for wardrobe confirmation." });
      }
    }

    const intakeCategory = categoryFromBackend(referenceItem.category, referenceItem.subcategory);
    const filename = safeFilename(referenceItem);
    const imageAsset = {
      url: referenceItem.imageUrl,
      storageKey: referenceItem.storageKey,
      provider: "s3",
      uploadedAt: new Date().toISOString(),
      purpose: "front",
      variants: {
        original: {
          url: referenceItem.imageUrl,
          storageKey: referenceItem.storageKey,
          provider: "s3",
          width: Number(referenceItem.imageQuality?.width || 0),
          height: Number(referenceItem.imageQuality?.height || 0),
          bytes: Number(referenceItem.imageQuality?.uploadedSizeBytes || 0),
          status: "ready",
          processedAt: new Date().toISOString()
        }
      }
    };
    const upload = await WardrobeUpload.create({
      userId: auth.user._id,
      storageKey: referenceItem.storageKey,
      filename,
      mimeType: String(referenceItem.imageQuality?.uploadedMimeType || "image/jpeg"),
      sizeBytes: Number(referenceItem.imageQuality?.uploadedSizeBytes || 1),
      width: Number(referenceItem.imageQuality?.width || 0),
      height: Number(referenceItem.imageQuality?.height || 0),
      provider: "s3",
      imageUrl: referenceItem.imageUrl,
      thumbnailUrl: referenceItem.imageUrl,
      selectedCategory: referenceItem.category || "",
      selectedCategoryLabel: referenceItem.subcategory || "",
      intakeCategoryId: intakeCategory?.id || "",
      intakeGroup: intakeCategory?.group || "",
      userInputMetadata: {
        category: referenceItem.category || "",
        subcategory: referenceItem.subcategory || "",
        source: "stylist_reference_item",
        referenceItemId: String(referenceItem._id),
        primaryImagePurpose: "front",
        photoCount: 1
      },
      categorySpecificMetadata: {
        title: intakeCategory?.title || referenceItem.subcategory || referenceItem.category || "",
        guidance: intakeCategory?.guidance || [],
        visionFocus: intakeCategory?.visionFocus || [],
        allowedMeasurementKeys: intakeCategory?.allowedMeasurementKeys || []
      },
      recommendationMetadata: {
        source: "stylist_reference_item",
        styles: referenceItem.styles || []
      },
      virtualTryOnMetadata: {
        eligibleHint: ["tops", "bottoms", "dresses", "outerwear", "shoes"].includes(referenceItem.category || ""),
        primaryImagePurpose: "front"
      },
      searchMetadata: {
        seedTerms: [
          referenceItem.primaryColor,
          referenceItem.subcategory,
          referenceItem.category,
          referenceItem.pattern,
          referenceItem.fabric,
          ...(referenceItem.styles || [])
        ].filter(Boolean)
      },
      images: {
        front: imageAsset,
        additional: []
      },
      uploadStatus: "uploaded",
      aiTagStatus: "suggested",
      aiProvider: "fitpick",
      aiConfidence: referenceItem.usableForMatching ? 0.84 : 0.55,
      aiAnalysis: referenceItemToWardrobeAiAnalysis(referenceItem),
      suggestedTags: suggestedTags(referenceItem)
    });

    referenceItem.convertedWardrobeUploadId = upload._id;
    await referenceItem.save();

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "stylist.reference_item.add_to_closet",
      entityType: "WardrobeUpload",
      entityId: String(upload._id)
    });
    logReferenceItemEvent({ event: "reference_item_added_to_closet", userId: String(auth.user._id), referenceItemId: id, status: referenceItem.status, category: referenceItem.category });

    return apiSuccess({
      referenceItem: serializeReferenceFashionItem(referenceItem),
      upload: serializeWardrobeUpload(upload),
      nextAction: `/wardrobe/${String(upload._id)}/confirm`
    }, { message: "Ready for wardrobe confirmation.", status: 201 });
  } catch (error) {
    logSafeError("stylist.reference.add-to-closet", error);
    return apiError("INTERNAL_ERROR", "Unable to prepare this item for wardrobe review right now.");
  }
}
