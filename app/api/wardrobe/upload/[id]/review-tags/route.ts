export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { inferCondition, isObjectId, serializeWardrobeItem, serializeWardrobeUpload } from "@/lib/wardrobe";
import { cleanGarmentMeasurements } from "@/lib/wardrobe/category-intelligence";
import {
  buildRecommendationMetadata,
  buildVirtualTryOnMetadata,
  buildWardrobeSearchMetadata
} from "@/lib/wardrobe/enrichment";
import { backgroundJobsEnabled, enqueueJob } from "@/lib/jobs/queue";
import { markReferenceItemConvertedToWardrobe } from "@/lib/ai/reference-fashion-item";
import { WardrobeItem } from "@/models/WardrobeItem";
import { WardrobeUpload } from "@/models/WardrobeUpload";
import { uploadTagReviewSchema } from "@/schemas/wardrobe.schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeList(values?: string[]) {
  return (values || []).map((value) => value.trim()).filter(Boolean).slice(0, 20);
}

function buildConfirmedAnalysis(aiAnalysis: any, verifiedFields: Record<string, any> = {}) {
  if (!aiAnalysis?.fields) return null;

  const confirmedFields = Object.fromEntries(
    Object.entries(aiAnalysis.fields).map(([key, field]: [string, any]) => {
      const verified = verifiedFields[key];
      if (!verified) return [key, field];

      return [
        key,
        {
          ...field,
          value: verified.value,
          originalConfidence: field?.confidence ?? verified.originalConfidence ?? 0,
          confidence: 1,
          source: "user_confirmed"
        }
      ];
    })
  );

  return {
    ...aiAnalysis,
    status: "confirmed",
    fields: confirmedFields
  };
}

function verifiedMetadata(verifiedFields: Record<string, any> = {}) {
  return Object.fromEntries(
    Object.entries(verifiedFields).map(([key, field]: [string, any]) => [
      key,
      {
        value: field.value,
        confidence: 1,
        originalConfidence: field.originalConfidence ?? field.confidence ?? 0,
        source: "user_confirmed"
      }
    ])
  );
}

function fitVerifiedFields(data: any) {
  return {
    taggedSize: { value: data.taggedSize || "unknown", confidence: 1, originalConfidence: 0, source: "user_confirmed" },
    sizeSystem: { value: data.sizeSystem || "unknown", confidence: 1, originalConfidence: 0, source: "user_confirmed" },
    garmentFit: { value: data.garmentFit || "unknown", confidence: 1, originalConfidence: 0, source: "user_confirmed" },
    stretchLevel: { value: data.stretchLevel || "unknown", confidence: 1, originalConfidence: 0, source: "user_confirmed" },
    fabricDrape: { value: data.fabricDrape || "unknown", confidence: 1, originalConfidence: 0, source: "user_confirmed" },
    fitConfidence: { value: data.fitConfidence ?? 0, confidence: 1, originalConfidence: 0, source: "user_confirmed" },
    measurementSource: { value: data.measurementSource || "unknown", confidence: 1, originalConfidence: 0, source: "user_confirmed" }
  };
}

function labelMetadataFromAnalysis(aiAnalysis: any) {
  const fields = aiAnalysis?.fields || {};
  return {
    labelExtractionStatus: aiAnalysis?.labelExtractionStatus || "not_provided",
    labelWarnings: aiAnalysis?.labelWarnings || [],
    rawLabelText: fields.rawLabelText || null,
    brand: fields.brand || null,
    size: fields.size || null,
    fabricComposition: fields.fabricComposition || null,
    careInstructions: fields.careInstructions || null,
    countryOfOrigin: fields.countryOfOrigin || null
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-upload-review:${meta.ip}`, limit: 30, windowMs: 60 * 1000 });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Wardrobe upload was not found.");

    const parsed = validateBody(uploadTagReviewSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const upload = await WardrobeUpload.findOne({ _id: id, userId: auth.user._id });
    if (!upload) return apiError("NOT_FOUND", "Wardrobe upload was not found.");
    if (upload.createdItemId) {
      return apiError("CONFLICT", "This upload has already been added to your wardrobe.");
    }

    const verifiedFields = {
      ...(parsed.data.verifiedFields || {}),
      ...fitVerifiedFields(parsed.data)
    };
    const condition = inferCondition(parsed.data);
    const garmentMeasurements = cleanGarmentMeasurements(
      parsed.data.garmentMeasurements || {},
      parsed.data.category,
      parsed.data.subcategory || ""
    );
    const item = await WardrobeItem.create({
      name: parsed.data.name,
      category: parsed.data.category,
      subcategory: parsed.data.subcategory || "",
      color: parsed.data.color,
      pattern: parsed.data.pattern || "",
      fabric: parsed.data.fabric || "",
      fit: parsed.data.fit || "",
      taggedSize: parsed.data.taggedSize || "unknown",
      sizeSystem: parsed.data.sizeSystem || "unknown",
      garmentFit: parsed.data.garmentFit || "unknown",
      garmentMeasurements,
      stretchLevel: parsed.data.stretchLevel || "unknown",
      fabricDrape: parsed.data.fabricDrape || "unknown",
      fitConfidence: parsed.data.fitConfidence ?? 0,
      measurementSource: parsed.data.measurementSource || "unknown",
      formality: normalizeList(parsed.data.formality),
      occasions: normalizeList(parsed.data.occasions),
      weather: normalizeList(parsed.data.weather),
      condition,
      userId: auth.user._id,
      storageKey: upload.storageKey,
      imageUrl: upload.imageUrl || "",
      thumbnailUrl: upload.thumbnailUrl || "",
      images: upload.images || {},
      userInputMetadata: upload.userInputMetadata || {},
      categorySpecificMetadata: upload.categorySpecificMetadata || {},
      ocrMetadata: {
        ...(upload.ocrMetadata || {}),
        ...labelMetadataFromAnalysis(upload.aiAnalysis),
        labelPhotoKinds: upload.labelPhotoKinds || []
      },
      recommendationMetadata: upload.recommendationMetadata || {},
      virtualTryOnMetadata: upload.virtualTryOnMetadata || {},
      searchMetadata: upload.searchMetadata || {},
      enrichmentStatus: backgroundJobsEnabled() ? "queued" : "completed",
      verifiedMetadata: verifiedMetadata(verifiedFields),
      aiAnalysis: buildConfirmedAnalysis(upload.aiAnalysis, verifiedFields)
    });

    if (!backgroundJobsEnabled()) {
      item.searchMetadata = buildWardrobeSearchMetadata(item);
      item.recommendationMetadata = {
        ...(item.recommendationMetadata || {}),
        ...buildRecommendationMetadata(item)
      };
      item.virtualTryOnMetadata = buildVirtualTryOnMetadata(item);
      item.enrichmentStatus = "completed";
      await item.save();
    }

    upload.createdItemId = item._id;
    upload.reviewedAt = new Date();
    upload.aiTagStatus = "completed";
    upload.taggedSize = parsed.data.taggedSize || "unknown";
    upload.sizeSystem = parsed.data.sizeSystem || "unknown";
    upload.garmentFit = parsed.data.garmentFit || "unknown";
    upload.garmentMeasurements = garmentMeasurements;
    upload.stretchLevel = parsed.data.stretchLevel || "unknown";
    upload.fabricDrape = parsed.data.fabricDrape || "unknown";
    upload.fitConfidence = parsed.data.fitConfidence ?? 0;
    upload.measurementSource = parsed.data.measurementSource || "unknown";
    upload.ocrMetadata = {
      ...(upload.ocrMetadata || {}),
      ...labelMetadataFromAnalysis(upload.aiAnalysis),
      labelPhotoKinds: upload.labelPhotoKinds || []
    };
    upload.enrichmentStatus = backgroundJobsEnabled() ? "queued" : "completed";
    await upload.save();
    const referenceItemId = (upload.userInputMetadata as any)?.referenceItemId;
    if (referenceItemId) {
      await markReferenceItemConvertedToWardrobe({
        userId: String(auth.user._id),
        referenceItemId,
        wardrobeUploadId: String(upload._id),
        wardrobeItemId: String(item._id)
      });
    }

    if (backgroundJobsEnabled()) {
      await enqueueJob(
        "wardrobe_enrichment",
        { wardrobeItemId: String(item._id) },
        { userId: auth.user._id, maxAttempts: 2 }
      );
      await enqueueJob(
        "garment_asset_generation",
        { wardrobeItemId: String(item._id) },
        { userId: auth.user._id, maxAttempts: 2 }
      );
    }

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "wardrobe.upload.review",
      entityType: "WardrobeUpload",
      entityId: String(upload._id)
    });

    return apiSuccess(
      {
        item: serializeWardrobeItem(item),
        upload: serializeWardrobeUpload(upload),
        nextAction: "wardrobe-item-created"
      },
      { message: "Upload reviewed and wardrobe item created.", status: 201 }
    );
  } catch (error) {
    logSafeError("wardrobe.upload.review-tags", error);
    return apiError("INTERNAL_ERROR", "Unable to review upload tags right now.");
  }
}
