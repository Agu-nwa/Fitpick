import { suggestWardrobeTags } from "@/lib/ai/tagging";
import { serializeAvatarPreview } from "@/lib/avatar/avatar-preview";
import { isCreditFeature, type CreditFeature } from "@/lib/credits/credit-costs";
import { spendCreditsAfterSuccess } from "@/lib/credits/credit-engine";
import { createGarmentAssetsForItemId, serializeGarmentAsset } from "@/lib/garment-assets/garment-assets";
import { runOutfitPreviewGenerationJob, serializeOutfitPreview } from "@/lib/outfit-preview/outfit-preview";
import { getTryOnProvider, runConfiguredVirtualTryOnJob } from "@/lib/tryon/tryon-provider";
import { runWardrobeEnrichmentJob } from "@/lib/wardrobe/enrichment";
import { WardrobeUpload } from "@/models/WardrobeUpload";

export async function runWardrobeAnalysisJob(input: { userId: string; uploadId: string }) {
  const upload = await WardrobeUpload.findOne({ _id: input.uploadId, userId: input.userId });
  if (!upload) throw new Error("Wardrobe upload was not found.");

  upload.aiTagStatus = "queued";
  upload.aiErrorSafeMessage = "";
  await upload.save();

  const result = await suggestWardrobeTags({
    uploadId: String(upload._id),
    filename: upload.filename || "",
    mimeType: upload.mimeType || "",
    storageKey: upload.storageKey || "",
    imageUrl: upload.imageUrl || "",
    thumbnailUrl: upload.thumbnailUrl || "",
    images: (upload.images || {}) as any,
    selectedCategory: (upload.selectedCategory || "") as any,
    selectedCategoryLabel: upload.selectedCategoryLabel || "",
    suggestedTags: upload.suggestedTags || {}
  });

  upload.aiProvider = result.provider;
  upload.aiConfidence = result.confidence || result.suggestedTags?.confidence || 0;
  upload.aiTagStatus = result.ok && result.suggestedTags ? result.aiTagStatus : "failed";
  upload.suggestedTags = result.suggestedTags || {};
  upload.aiAnalysis = result.aiAnalysis || null;
  upload.aiErrorSafeMessage = result.ok ? "" : result.safeMessage || "We could not suggest tags for this item. You can add them manually.";
  await upload.save();

  return {
    uploadId: String(upload._id),
    aiTagStatus: upload.aiTagStatus,
    ok: result.ok,
    confidence: upload.aiConfidence
  };
}

export async function runBackgroundJobByType(job: any) {
  const payload = job.payload || {};
  const userId = String(job.userId);

  const chargeSuccessfulJob = async (fallbackFeature: CreditFeature, cached?: boolean) => {
    const feature = isCreditFeature(payload.creditFeature) ? payload.creditFeature : fallbackFeature;
    if (cached) return null;
    return spendCreditsAfterSuccess({
      userId,
      feature,
      referenceId: `job:${String(job._id)}`,
      metadata: {
        jobType: job.type,
        outfitId: String(payload.outfitId || ""),
        source: typeof payload.source === "string" ? payload.source : "background_job"
      }
    });
  };

  if (job.type === "outfit_preview_generation") {
    const result = await runOutfitPreviewGenerationJob({
      userId,
      outfitId: String(payload.outfitId || ""),
      style: payload.style || "flat_lay",
      cacheKey: payload.cacheKey
    });
    const preview = (result.preview as any)?.toObject?.() ?? result.preview;
    const creditCharge = await chargeSuccessfulJob("outfit_preview", result.cached);

    return {
      preview: serializeOutfitPreview({ ...preview, cached: result.cached }),
      creditCharge: creditCharge ? { feature: creditCharge.transaction.feature, credits: creditCharge.transaction.credits, balance: creditCharge.wallet.balance } : null
    };
  }

  if (job.type === "avatar_preview_generation") {
    const result = await runConfiguredVirtualTryOnJob({
      userId,
      outfitId: String(payload.outfitId || ""),
      avatarProfileId: String(payload.avatarProfileId || ""),
      wardrobeItemIds: Array.isArray(payload.wardrobeItemIds) ? payload.wardrobeItemIds.map(String) : [],
      desiredView: payload.posePreset === "walking" ? "walking" : undefined,
      visualizationStyle: payload.visualizationStyle || undefined,
      posePreset: payload.posePreset || undefined,
      cacheKey: payload.cacheKey
    });
    const preview = (result.preview as any)?.toObject?.() ?? result.preview;
    const creditCharge = await chargeSuccessfulJob("virtual_try_on", result.cached);

    return {
      preview: serializeAvatarPreview({ ...preview, cached: result.cached }),
      creditCharge: creditCharge ? { feature: creditCharge.transaction.feature, credits: creditCharge.transaction.credits, balance: creditCharge.wallet.balance } : null
    };
  }

  if (job.type === "fit_locked_preview_generation") {
    const provider = getTryOnProvider("internal_preview");
    return provider.generateTryOnPreview({
      userId,
      outfitRecommendationId: String(payload.outfitId || ""),
      avatarProfileId: String(payload.avatarProfileId || ""),
      wardrobeItemIds: Array.isArray(payload.wardrobeItemIds) ? payload.wardrobeItemIds.map(String) : [],
      desiredView: payload.desiredView === "walking" || payload.desiredView === "360" || payload.desiredView === "side" || payload.desiredView === "back" ? payload.desiredView : "front",
      accuracyLevelRequested: "fit_locked",
      cacheKey: payload.cacheKey ? String(payload.cacheKey) : undefined
    });
  }

  if (job.type === "wardrobe_analysis") {
    return runWardrobeAnalysisJob({
      userId,
      uploadId: String(payload.uploadId || "")
    });
  }

  if (job.type === "wardrobe_enrichment") {
    return runWardrobeEnrichmentJob({
      userId,
      wardrobeItemId: String(payload.wardrobeItemId || "")
    });
  }

  if (job.type === "garment_asset_generation") {
    const assets = await createGarmentAssetsForItemId(userId, String(payload.wardrobeItemId || ""));
    return {
      assets: assets.map((asset) => serializeGarmentAsset(asset)),
      count: assets.length
    };
  }

  if (job.type === "true_3d_tryon_generation") {
    const result = await runConfiguredVirtualTryOnJob({
      userId,
      outfitId: String(payload.outfitId || ""),
      avatarProfileId: String(payload.avatarProfileId || ""),
      wardrobeItemIds: Array.isArray(payload.wardrobeItemIds) ? payload.wardrobeItemIds.map(String) : [],
      desiredView: "360",
      cacheKey: payload.cacheKey ? String(payload.cacheKey) : undefined
    });
    const preview = (result.preview as any)?.toObject?.() ?? result.preview;

    return {
      preview: preview ? serializeAvatarPreview({ ...preview, cached: result.cached }) : null,
      providerOutput: (result as any).providerOutput
    };
  }

  return {
    skipped: true,
    reason: `Unsupported background job type: ${job.type}.`
  };
}
