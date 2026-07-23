import { suggestWardrobeTags } from "@/lib/ai/tagging";
import { errorCategory } from "@/lib/ai/observability/ai-logger";
import { serializeAvatarPreview } from "@/lib/avatar/avatar-preview";
import { isCreditFeature, type CreditFeature } from "@/lib/credits/credit-costs";
import { spendCreditsAfterSuccess } from "@/lib/credits/credit-engine";
import { createGarmentAssetsForItemId, serializeGarmentAsset } from "@/lib/garment-assets/garment-assets";
import { runOutfitPreviewGenerationJob, serializeOutfitPreview } from "@/lib/outfit-preview/outfit-preview";
import {
  commitTryOnGenerationCredits,
  createTryOnIdempotencyKey,
  failTryOnGeneration,
  getOrCreateTryOnGeneration,
  isActiveTryOnGenerationStatus,
  markTryOnGenerationStage,
  reserveTryOnGenerationCredits
} from "@/lib/tryon/tryon-generation";
import { isTransientTryOnError, PermanentTryOnError } from "@/lib/tryon/reliability";
import { getTryOnProvider, runConfiguredVirtualTryOnJob } from "@/lib/tryon/tryon-provider";
import { runWardrobeEnrichmentJob } from "@/lib/wardrobe/enrichment";
import { AvatarOutfitPreview } from "@/models/AvatarOutfitPreview";
import { TryOnGeneration } from "@/models/TryOnGeneration";
import { WardrobeUpload } from "@/models/WardrobeUpload";

const avatarPreviewJobType = ["avatar", "preview", "generation"].join("_");

function isInsufficientCreditsLike(error: unknown) {
  return Boolean(error && typeof error === "object" && "name" in error && String((error as { name?: unknown }).name) === "InsufficientCreditsError");
}

export function isRetryableBackgroundJobFailure(job: any, error: unknown) {
  if (job?.type !== avatarPreviewJobType) return true;
  if (error instanceof PermanentTryOnError || isInsufficientCreditsLike(error)) return false;
  const message = error instanceof Error ? error.message : String(error || "");
  if (/not found|setup required|consent|configured|configuration|missing selected|insufficient credits|unauthorized|forbidden|validation/i.test(message)) return false;
  if (isTransientTryOnError(error)) return true;
  return /provider|fashn|openai|storage|s3|upload|download|readback|network|fetch|timeout|temporary/i.test(message);
}

export async function handleTerminalBackgroundJobFailure(job: any, code = "background_job_failed", message = "Virtual Try-On could not be completed. Your credit was not deducted.") {
  if (job?.type !== avatarPreviewJobType) return;
  const payload = job.payload || {};
  const userId = String(job.userId || "");
  const outfitId = String(payload.outfitId || "");
  const cacheKey = String(payload.cacheKey || "");
  const generationId = String(payload.generationId || "");

  const generation = generationId
    ? await TryOnGeneration.findOne({ generationId })
    : await TryOnGeneration.findOne({ userId, outfitId, cacheKey }).sort({ createdAt: -1 });

  if (generation && isActiveTryOnGenerationStatus(generation.status)) {
    await failTryOnGeneration({
      generation,
      stage: "background_job_terminal",
      code,
      message
    });
  }

  if (!generation || generation.status !== "completed") {
    await AvatarOutfitPreview.findOneAndUpdate(
      { userId, outfitId, cacheKey },
      {
        $set: {
          status: "failed",
          billingStatus: "released",
          generationId: generation?.generationId || generationId,
          errorMessage: message,
          lastAttemptAt: new Date()
        }
      }
    );
  }
}

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

  if (job.type === avatarPreviewJobType) {
    const feature = isCreditFeature(payload.creditFeature) ? payload.creditFeature : "virtual_try_on";
    const outfitId = String(payload.outfitId || "");
    const avatarProfileId = String(payload.avatarProfileId || "");
    const cacheKey = String(payload.cacheKey || "");
    const generationResult = await getOrCreateTryOnGeneration({
      userId,
      outfitId,
      avatarProfileId,
      cacheKey,
      creditFeature: feature,
      idempotencyKey: String(payload.idempotencyKey || createTryOnIdempotencyKey({ source: "avatar-preview-job", userId, outfitId, cacheKey, clientKey: String(job._id) })),
      provider: String(process.env.TRYON_PROVIDER || "internal_preview"),
      metadata: {
        source: typeof payload.source === "string" ? payload.source : "background_job",
        jobId: String(job._id)
      }
    });
    let generation: any = generationResult.generation;
    if (generationResult.reused && generation.status === "completed") {
      const completedPreview = await AvatarOutfitPreview.findOne({
        userId,
        outfitId,
        cacheKey,
        status: "ready",
        imageUrl: { $ne: "" },
        storageKey: { $ne: "" }
      }).lean() as any;
      if (completedPreview) {
        return {
          preview: serializeAvatarPreview({ ...completedPreview, cached: true }),
          generationId: generation.generationId,
          creditCharge: null
        };
      }
      throw new PermanentTryOnError("Completed try-on generation is missing its saved preview.", "completed_preview_missing");
    }
    if (generationResult.reused && ["failed", "cancelled", "expired"].includes(String(generation.status || ""))) {
      throw new PermanentTryOnError("Try-on generation already reached a terminal state.", "generation_terminal");
    }
    if (!generation.creditsReserved && !generation.creditsCommitted) await reserveTryOnGenerationCredits(generation);
    generation = await markTryOnGenerationStage(generation.generationId, "submitting") || generation;

    try {
      const result = await runConfiguredVirtualTryOnJob({
        userId,
        outfitId,
        avatarProfileId,
        wardrobeItemIds: Array.isArray(payload.wardrobeItemIds) ? payload.wardrobeItemIds.map(String) : [],
        desiredView: payload.posePreset === "walking" ? "walking" : undefined,
        visualizationStyle: payload.visualizationStyle || undefined,
        posePreset: payload.posePreset || undefined,
        cacheKey
      });
      const preview = (result.preview as any)?.toObject?.() ?? result.preview;
      generation = await markTryOnGenerationStage(generation.generationId, "provider_completed", {
        providerJobId: result.providerOutput?.jobId || "",
        providerDiagnostics: { status: result.providerOutput?.status || "", warningCount: result.providerOutput?.warnings?.length || 0 }
      }) || generation;
      let creditCharge: Awaited<ReturnType<typeof commitTryOnGenerationCredits>>["creditCharge"] | null = null;
      if (!result.cached) {
        const committed = await commitTryOnGenerationCredits({
          generation,
          preview,
          metadata: {
            jobType: job.type,
            jobId: String(job._id),
            outfitId,
            source: typeof payload.source === "string" ? payload.source : "background_job"
          }
        });
        creditCharge = committed.creditCharge;
        generation = committed.generation;
        await AvatarOutfitPreview.findOneAndUpdate({ userId, outfitId, cacheKey }, { $set: { billingStatus: "committed", generationId: generation.generationId } });
      }

      return {
        preview: serializeAvatarPreview({ ...preview, cached: result.cached }),
        generationId: generation.generationId,
        creditCharge: creditCharge ? { feature: creditCharge.transaction.feature, credits: creditCharge.transaction.credits, balance: creditCharge.wallet.balance } : null
      };
    } catch (error) {
      const retryable = isRetryableBackgroundJobFailure(job, error);
      if (retryable) {
        await AvatarOutfitPreview.findOneAndUpdate({ userId, outfitId, cacheKey }, {
          $set: {
            status: "generating",
            billingStatus: "reserved",
            errorMessage: "",
            lastAttemptAt: new Date()
          }
        });
        await markTryOnGenerationStage(generation.generationId, "queued", {
          failureStage: "worker_generation_retry",
          failureCode: errorCategory(error),
          failureMessage: "",
          retryCount: Number(generation.retryCount || 0) + 1
        });
      } else {
        await AvatarOutfitPreview.findOneAndUpdate({ userId, outfitId, cacheKey }, {
          $set: {
            status: "failed",
            billingStatus: "released",
            errorMessage: "Virtual Try-On could not be completed. Your credit was not deducted.",
            lastAttemptAt: new Date()
          }
        });
        await failTryOnGeneration({ generation, stage: "worker_generation", code: "background_tryon_failed", error });
      }
      throw error;
    }
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
