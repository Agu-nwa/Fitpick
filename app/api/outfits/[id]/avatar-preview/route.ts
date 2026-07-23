export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAiModel } from "@/lib/ai/models/registry";
import { errorCategory, logAiEvent } from "@/lib/ai/observability/ai-logger";
import {
  avatarPreviewPromptVersion,
  buildAvatarCacheKeyFromItems,
  getCachedAvatarPreview,
  loadOwnedAvatarPreviewSubject,
  markAvatarPreviewStatus,
  serializeAvatarPreview
} from "@/lib/avatar/avatar-preview";
import { serializeAvatarProfile } from "@/lib/avatar/avatar-profile";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { type CreditFeature } from "@/lib/credits/credit-costs";
import { insufficientCreditsPayload, InsufficientCreditsError } from "@/lib/credits/credit-engine";
import { evaluateOutfitFitOnAvatar } from "@/lib/fit/fit-lock";
import { backgroundJobsEnabled, enqueueJob, serializeJob } from "@/lib/jobs/queue";
import { summarizeVisualizationRisks } from "@/lib/preview/visual-grounding";
import { serializeProgressiveTrigger, triggerForVirtualTryOn } from "@/lib/progressive-intelligence/triggers";
import { rateLimitRequest } from "@/lib/rate-limit";
import { recordOutfitHistory } from "@/lib/recommendation/history";
import { logSafeError } from "@/lib/security/safe-log";
import {
  commitTryOnGenerationCredits,
  createTryOnIdempotencyKey,
  failTryOnGeneration,
  findActiveTryOnGeneration,
  getOrCreateTryOnGeneration,
  isActiveTryOnGenerationStatus,
  isInsufficientCreditsError,
  logTryOnGenerationEvent,
  markTryOnGenerationStage,
  reserveTryOnGenerationCredits,
  safeTryOnFailureMessage,
  serializeTryOnGeneration
} from "@/lib/tryon/tryon-generation";
import { getConfiguredTryOnProviderType, runConfiguredVirtualTryOnJob } from "@/lib/tryon/tryon-provider";
import { readJson, validateBody } from "@/lib/validation";
import { isObjectId } from "@/lib/wardrobe";
import { AvatarOutfitPreview } from "@/models/AvatarOutfitPreview";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const avatarPreviewRequestSchema = z.object({
  visualizationStyle: z.enum(["minimal", "luxury", "streetwear", "editorial"]).optional(),
  posePreset: z.enum(["standing", "walking", "editorial", "runway", "casual"]).optional(),
  regenerate: z.boolean().default(false),
  idempotencyKey: z.string().trim().min(8).max(120).optional()
});

function groundingPatch(items: any[], preview?: any) {
  const grounding = summarizeVisualizationRisks(items, {
    outfitDescription: items.map((item) => `Wardrobe item ID: ${String(item._id)} Category: ${item.category || "unknown"}`).join("\n")
  });
  const previewGroundedIds = Array.isArray(preview?.groundedItemIds) && preview.groundedItemIds.length ? preview.groundedItemIds : grounding.groundedItemIds;
  const previewMissingIds = Array.isArray(preview?.missingVisualItemIds) && preview.missingVisualItemIds.length ? preview.missingVisualItemIds : grounding.missingVisualItemIds;
  const previewWarnings = Array.isArray(preview?.visualizationWarnings) && preview.visualizationWarnings.length ? preview.visualizationWarnings : grounding.visualizationWarnings;
  return {
    groundedItemIds: previewGroundedIds.map(String),
    missingVisualItemIds: previewMissingIds.map(String),
    visualizationWarnings: previewWarnings,
    footwearIncluded: typeof preview?.footwearIncluded === "boolean" ? preview.footwearIncluded : grounding.footwearIncluded,
    visualGroundingStatus: preview?.visualGroundingStatus || grounding.visualGroundingStatus
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `avatar-preview:get:${meta.ip}`, limit: 60, windowMs: 60 * 1000, operation: "avatar-preview-get" });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Outfit was not found.");

    const loaded = await loadOwnedAvatarPreviewSubject(String(auth.user._id), id);
    if (!loaded) return apiError("NOT_FOUND", "Outfit was not found.");

    const options = {
      visualizationStyle: loaded.avatarProfile.visualizationStyle,
      posePreset: loaded.avatarProfile.posePreset
    };
    const cacheKey = buildAvatarCacheKeyFromItems(String(auth.user._id), id, loaded.items, loaded.avatarProfile, options);
    const cached = await getCachedAvatarPreview(String(auth.user._id), id, cacheKey);
    const latest = cached || await AvatarOutfitPreview.findOne({ userId: auth.user._id, outfitId: id }).sort({ updatedAt: -1 }).lean();

    return apiSuccess({
      preview: serializeAvatarPreview(latest ? { ...latest, ...groundingPatch(loaded.items, latest) } : groundingPatch(loaded.items)),
      avatarProfile: serializeAvatarProfile(loaded.avatarProfile)
    });
  } catch (error) {
    logSafeError("avatar-preview.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load your avatar preview right now.");
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `avatar-preview:post:${meta.ip}`, limit: 8, windowMs: 60 * 1000, operation: "avatar-preview-generation" });
  if (limited) return limited;

  let activeCacheKey = "";
  let activeUserId = "";
  let activeAvatarProfileId = "";
  let activeOutfitId = "";
  let activeGeneration: any = null;

  try {
    const { id } = await context.params;
    activeOutfitId = id;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Outfit was not found.");
    activeUserId = String(auth.user._id);

    const parsed = validateBody(avatarPreviewRequestSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    if (getConfiguredTryOnProviderType() === "internal_preview" && !process.env.OPENAI_API_KEY) {
      return apiError("INTERNAL_ERROR", "Avatar preview is not configured yet.");
    }

    const loaded = await loadOwnedAvatarPreviewSubject(activeUserId, id);
    if (!loaded) return apiError("NOT_FOUND", "Outfit was not found.");
    if (loaded.missingItems || !loaded.items.length) {
      return apiError("BAD_REQUEST", "This avatar preview needs all selected saved clothes available.");
    }

    const tryOnSetupTrigger = triggerForVirtualTryOn(loaded.avatarProfile);
    if (tryOnSetupTrigger) {
      return apiError("SETUP_REQUIRED", "Set up your try-on model before generating this preview.", {
        details: {
          progressiveTrigger: serializeProgressiveTrigger(tryOnSetupTrigger),
          setupPath: "/avatar"
        }
      });
    }

    activeAvatarProfileId = String(loaded.avatarProfile._id);
    const options = {
      visualizationStyle: parsed.data.visualizationStyle || loaded.avatarProfile.visualizationStyle || "luxury",
      posePreset: parsed.data.posePreset || loaded.avatarProfile.posePreset || "standing"
    };
    const fitEvaluation = evaluateOutfitFitOnAvatar(loaded.avatarProfile, loaded.items);
    const visualGrounding = groundingPatch(loaded.items);
    const cacheKey = buildAvatarCacheKeyFromItems(activeUserId, id, loaded.items, loaded.avatarProfile, options);
    activeCacheKey = cacheKey;

    const cached = parsed.data.regenerate ? null : await getCachedAvatarPreview(activeUserId, id, cacheKey) as any;
    if (cached?.imageUrl) {
      logAiEvent({
        operation: "avatar-preview",
        model: cached.model || getAiModel("imageGeneration"),
        latencyMs: 0,
        status: "success",
        cacheHit: true,
        provider: cached.provider || "s3"
      });
      return apiSuccess({
        preview: serializeAvatarPreview({ ...cached, ...groundingPatch(loaded.items, cached), cached: true }),
        avatarProfile: serializeAvatarProfile(loaded.avatarProfile)
      });
    }

    const creditFeature: CreditFeature = parsed.data.regenerate ? "regenerate_try_on" : "virtual_try_on";

    logTryOnGenerationEvent({ event: "credit_checked", userId: activeUserId, outfitId: id, provider: getConfiguredTryOnProviderType(), stage: "credit_check" });

    const activeExistingGeneration = await findActiveTryOnGeneration({
      userId: auth.user._id,
      outfitId: id,
      cacheKey,
      creditFeature
    }).lean() as any;

    if (activeExistingGeneration) {
      const inFlight = await AvatarOutfitPreview.findOne({
        userId: auth.user._id,
        outfitId: id,
        cacheKey,
        status: "generating"
      }).lean() as any;
      return apiSuccess({
        preview: serializeAvatarPreview({ ...(inFlight || { status: "generating", provider: "s3", cacheKey }), ...groundingPatch(loaded.items, inFlight) }),
        avatarProfile: serializeAvatarProfile(loaded.avatarProfile),
        generation: serializeTryOnGeneration(activeExistingGeneration)
      }, { message: "Avatar preview is already being prepared." });
    }

    const clientIdempotencyKey = request.headers.get("idempotency-key") || parsed.data.idempotencyKey || "";
    const idempotencyKey = createTryOnIdempotencyKey({
      source: "avatar-preview",
      userId: activeUserId,
      outfitId: id,
      cacheKey,
      regenerate: parsed.data.regenerate,
      clientKey: clientIdempotencyKey
    });
    let generationResult = await getOrCreateTryOnGeneration({
      userId: auth.user._id,
      outfitId: loaded.outfit._id,
      avatarProfileId: loaded.avatarProfile._id,
      cacheKey,
      creditFeature,
      idempotencyKey,
      provider: getConfiguredTryOnProviderType(),
      metadata: { source: "avatar_preview_route", posePreset: options.posePreset, visualizationStyle: options.visualizationStyle }
    });
    activeGeneration = generationResult.generation;

    if (generationResult.reused && activeGeneration.status === "failed" && !clientIdempotencyKey) {
      generationResult = await getOrCreateTryOnGeneration({
        userId: auth.user._id,
        outfitId: loaded.outfit._id,
        avatarProfileId: loaded.avatarProfile._id,
        cacheKey,
        creditFeature,
        idempotencyKey: createTryOnIdempotencyKey({ source: "avatar-preview", userId: activeUserId, outfitId: id, cacheKey, regenerate: true }),
        provider: getConfiguredTryOnProviderType(),
        metadata: { source: "avatar_preview_route", posePreset: options.posePreset, visualizationStyle: options.visualizationStyle, retryOf: activeGeneration.generationId }
      });
      activeGeneration = generationResult.generation;
    }

    if (generationResult.reused && activeGeneration.status === "completed") {
      const completedPreview = await AvatarOutfitPreview.findOne({
        userId: auth.user._id,
        outfitId: id,
        cacheKey,
        status: "ready",
        imageUrl: { $ne: "" },
        storageKey: { $ne: "" }
      }).lean() as any;
      if (completedPreview?.imageUrl) {
        return apiSuccess({
          preview: serializeAvatarPreview({ ...completedPreview, ...groundingPatch(loaded.items, completedPreview), cached: true }),
          avatarProfile: serializeAvatarProfile(loaded.avatarProfile),
          generation: serializeTryOnGeneration(activeGeneration)
        });
      }
    }

    if (generationResult.reused && isActiveTryOnGenerationStatus(activeGeneration.status)) {
      return apiSuccess({
        preview: serializeAvatarPreview({ status: "generating", provider: "s3", cacheKey, generationId: activeGeneration.generationId, ...visualGrounding }),
        avatarProfile: serializeAvatarProfile(loaded.avatarProfile),
        generation: serializeTryOnGeneration(activeGeneration)
      }, { message: "Avatar preview is already being prepared." });
    }

    if (generationResult.reused && activeGeneration.status === "failed") {
      return apiError("INTERNAL_ERROR", activeGeneration.failureMessage || "Virtual Try-On could not be completed. Your credit was not deducted.", {
        details: { generation: serializeTryOnGeneration(activeGeneration) }
      });
    }

    const latestAttempt = await AvatarOutfitPreview.findOne({
      userId: auth.user._id,
      outfitId: id,
      cacheKey
    }).lean() as any;

    if ((latestAttempt?.attempts || 0) >= 5 && !parsed.data.regenerate) {
      await failTryOnGeneration({ generation: activeGeneration, stage: "validation", code: "retry_limit" });
      return apiError("RATE_LIMITED", "Avatar preview has been retried several times. Please try again later.");
    }

    try {
      await reserveTryOnGenerationCredits(activeGeneration);
    } catch (error) {
      await failTryOnGeneration({ generation: activeGeneration, stage: "credit_check", code: "insufficient_credits", error });
      if (error instanceof InsufficientCreditsError) {
        return apiError("INSUFFICIENT_CREDITS", "You're out of Credits. Purchase more Credits to continue.", {
          details: insufficientCreditsPayload(error)
        });
      }
      throw error;
    }

    await markAvatarPreviewStatus(
      activeUserId,
      id,
      activeAvatarProfileId,
      cacheKey,
      {
        userId: auth.user._id,
        outfitId: loaded.outfit._id,
        avatarProfileId: loaded.avatarProfile._id,
        itemIds: loaded.itemIds,
        cacheKey,
        generationId: activeGeneration.generationId,
        idempotencyKey,
        creditReferenceId: activeGeneration.creditReferenceId,
        billingStatus: "reserved",
        status: "generating",
        provider: "s3",
        promptVersion: avatarPreviewPromptVersion,
        model: getAiModel("imageGeneration"),
        visualizationStyle: options.visualizationStyle,
        posePreset: options.posePreset,
        accuracyLevel: fitEvaluation.accuracyLevel.id,
        fitStatus: fitEvaluation.fitStatus,
        fitConfidence: fitEvaluation.fitConfidence,
        fitWarnings: fitEvaluation.warnings,
        fitLockInstructions: fitEvaluation.lockedFitInstructions,
        groundedItemIds: visualGrounding.groundedItemIds,
        missingVisualItemIds: visualGrounding.missingVisualItemIds,
        visualizationWarnings: visualGrounding.visualizationWarnings,
        footwearIncluded: visualGrounding.footwearIncluded,
        visualGroundingStatus: visualGrounding.visualGroundingStatus,
        errorMessage: "",
        lastAttemptAt: new Date()
      },
      true
    );

    if (backgroundJobsEnabled()) {
      await markAvatarPreviewStatus(activeUserId, id, activeAvatarProfileId, cacheKey, { status: "generating", billingStatus: "reserved", generationId: activeGeneration.generationId });
      activeGeneration = await markTryOnGenerationStage(activeGeneration.generationId, "queued") || activeGeneration;
      const job = await enqueueJob(
        "avatar_preview_generation",
        {
          outfitId: id,
          avatarProfileId: activeAvatarProfileId,
          visualizationStyle: options.visualizationStyle,
          posePreset: options.posePreset,
          wardrobeItemIds: loaded.itemIds,
          cacheKey,
          creditFeature,
          generationId: activeGeneration.generationId,
          idempotencyKey,
          creditReferenceId: activeGeneration.creditReferenceId,
          source: "avatar_preview_route"
        },
        {
          userId: auth.user._id,
          maxAttempts: 3
        }
      );

      await recordOutfitHistory({
        userId: auth.user._id,
        outfitId: loaded.outfit._id,
        itemIds: loaded.itemIds,
        eventType: "virtual_try_on_generated",
        source: loaded.outfit.source === "stylist_chat" ? "stylist_chat" : "outfit_page",
        recommendationMode: loaded.outfit.recommendationMode || loaded.outfit.reasoningMetadata?.recommendationMode || "todays_best",
        occasion: loaded.outfit.occasion,
        context: { visualMode: "digital_human", queued: true }
      });

      return apiSuccess(
        {
          preview: serializeAvatarPreview({
            status: "generating",
            provider: "s3",
            cacheKey,
            promptVersion: avatarPreviewPromptVersion,
            model: getAiModel("imageGeneration"),
            visualizationStyle: options.visualizationStyle,
            posePreset: options.posePreset,
            accuracyLevel: fitEvaluation.accuracyLevel.id,
            fitStatus: fitEvaluation.fitStatus,
            fitConfidence: fitEvaluation.fitConfidence,
            fitWarnings: fitEvaluation.warnings,
            fitLockInstructions: fitEvaluation.lockedFitInstructions,
            ...visualGrounding
          }),
          avatarProfile: serializeAvatarProfile(loaded.avatarProfile),
          generation: serializeTryOnGeneration(activeGeneration),
          job: serializeJob(job)
        },
        { message: "Your avatar preview is being prepared.", status: 202 }
      );
    }

    activeGeneration = await markTryOnGenerationStage(activeGeneration.generationId, "submitting") || activeGeneration;
    const result = await runConfiguredVirtualTryOnJob({
      userId: activeUserId,
      outfitId: id,
      avatarProfileId: activeAvatarProfileId,
      wardrobeItemIds: loaded.itemIds,
      desiredView: options.posePreset === "walking" ? "walking" : undefined,
      visualizationStyle: options.visualizationStyle,
      posePreset: options.posePreset,
      cacheKey
    });
    const saved = (result.preview as any)?.toObject?.() ?? result.preview;
    if (!saved) throw new Error("Virtual try-on is not ready yet.");
    activeGeneration = await markTryOnGenerationStage(activeGeneration.generationId, "provider_completed", {
      providerJobId: result.providerOutput?.jobId || "",
      providerDiagnostics: { status: result.providerOutput?.status || "", warningCount: result.providerOutput?.warnings?.length || 0 }
    }) || activeGeneration;
    await recordOutfitHistory({
      userId: auth.user._id,
      outfitId: loaded.outfit._id,
      itemIds: loaded.itemIds,
      eventType: "virtual_try_on_generated",
      source: loaded.outfit.source === "stylist_chat" ? "stylist_chat" : "outfit_page",
      recommendationMode: loaded.outfit.recommendationMode || loaded.outfit.reasoningMetadata?.recommendationMode || "todays_best",
      occasion: loaded.outfit.occasion,
      context: { visualMode: "digital_human", cached: Boolean(result.cached) }
    });
    let creditCharge: Awaited<ReturnType<typeof commitTryOnGenerationCredits>>["creditCharge"] | null = null;
    if (!result.cached) {
      try {
        const committed = await commitTryOnGenerationCredits({
          generation: activeGeneration,
          preview: saved,
          metadata: { source: "avatar_preview_route", posePreset: options.posePreset, visualizationStyle: options.visualizationStyle }
        });
        creditCharge = committed.creditCharge;
        activeGeneration = committed.generation;
        await markAvatarPreviewStatus(activeUserId, id, activeAvatarProfileId, cacheKey, { billingStatus: "committed", generationId: activeGeneration.generationId });
      } catch (error) {
        await markAvatarPreviewStatus(activeUserId, id, activeAvatarProfileId, cacheKey, {
          status: "failed",
          billingStatus: "released",
          errorMessage: "Virtual Try-On could not be completed. Your credit was not deducted.",
          lastAttemptAt: new Date()
        });
        await failTryOnGeneration({ generation: activeGeneration, stage: "credit_commit", code: "credit_commit_failed", error });
        if (isInsufficientCreditsError(error)) {
          return apiError("INSUFFICIENT_CREDITS", "You're out of Credits. Purchase more Credits to continue.", {
            details: insufficientCreditsPayload(error)
          });
        }
        throw error;
      }
    }

    return apiSuccess({
      preview: serializeAvatarPreview(saved),
      avatarProfile: serializeAvatarProfile(loaded.avatarProfile),
      generation: serializeTryOnGeneration(activeGeneration),
      ...(creditCharge ? {
        wallet: creditCharge.wallet,
        creditCharge: { feature: creditCharge.transaction.feature, credits: creditCharge.transaction.credits, balance: creditCharge.wallet.balance }
      } : {})
    }, { message: "Avatar preview ready.", status: 201 });
  } catch (error) {
    try {
      if (activeUserId && activeAvatarProfileId && isObjectId(activeOutfitId)) {
        await markAvatarPreviewStatus(
          activeUserId,
          activeOutfitId,
          activeAvatarProfileId,
          activeCacheKey || `failed:${activeOutfitId}`,
          {
            cacheKey: activeCacheKey || `failed:${activeOutfitId}`,
            status: "failed",
            billingStatus: "released",
            errorMessage: "Virtual Try-On could not be completed. Your credit was not deducted.",
            lastAttemptAt: new Date()
          }
        );
      }
      if (activeGeneration) {
        await failTryOnGeneration({ generation: activeGeneration, stage: "exception", code: errorCategory(error), error });
      }
    } catch {
      // Keep failure bookkeeping from leaking raw provider errors.
    }

    logAiEvent({
      operation: "avatar-preview",
      model: getAiModel("imageGeneration"),
      latencyMs: 0,
      status: "failed",
      cacheHit: false,
      provider: "s3",
      errorCategory: errorCategory(error)
    });

    return apiError("INTERNAL_ERROR", safeTryOnFailureMessage(error));
  }
}
