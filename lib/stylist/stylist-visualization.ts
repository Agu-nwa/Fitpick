import crypto from "crypto";
import { getAiModel } from "@/lib/ai/models/registry";
import type { StylistIntent, StylistVisualMode } from "@/lib/ai/schemas/stylist.schema";
import {
  avatarPreviewPromptVersion,
  buildAvatarCacheKeyFromItems,
  getCachedAvatarPreview,
  loadOwnedAvatarPreviewSubject,
  markAvatarPreviewStatus,
  serializeAvatarPreview
} from "@/lib/avatar/avatar-preview";
import type { PosePreset, VisualizationStyle } from "@/lib/avatar/avatar-profile";
import type { CreditFeature } from "@/lib/credits/credit-costs";
import { ensureCreditsForFeature, InsufficientCreditsError, spendCreditsAfterSuccess } from "@/lib/credits/credit-engine";
import { evaluateOutfitFitOnAvatar, type FitEvaluation } from "@/lib/fit/fit-lock";
import { backgroundJobsEnabled, enqueueJob, serializeJob } from "@/lib/jobs/queue";
import { summarizeVisualizationRisks } from "@/lib/preview/visual-grounding";
import { serializeProgressiveTrigger, triggerForVirtualTryOn } from "@/lib/progressive-intelligence/triggers";
import {
  commitTryOnGenerationCredits,
  createTryOnIdempotencyKey,
  failTryOnGeneration,
  findActiveTryOnGeneration,
  getOrCreateTryOnGeneration,
  isActiveTryOnGenerationStatus,
  markTryOnGenerationStage,
  reserveTryOnGenerationCredits
} from "@/lib/tryon/tryon-generation";
import { runConfiguredVirtualTryOnJob } from "@/lib/tryon/tryon-provider";
import {
  buildPreviewCacheKeyFromItems,
  generateOutfitPreview as generatePremiumOutfitPreview,
  getCachedOutfitPreview,
  loadOwnedPreviewSubject,
  previewPromptVersion,
  saveGeneratedPreview,
  serializeOutfitPreview
} from "@/lib/outfit-preview/outfit-preview";
import { serializeOutfit } from "@/lib/recommendation/engine";
import { AvatarOutfitPreview } from "@/models/AvatarOutfitPreview";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { OutfitPreview } from "@/models/OutfitPreview";

export const stylistVisualizationDisclaimer = "This is a preview, not a perfect fitting.";

export type StylistVisualizationOptions = {
  includeVisualization?: boolean;
  visualMode?: StylistVisualMode;
  hasOutfit?: boolean;
  regenerate?: boolean;
  visualizationStyle?: VisualizationStyle;
  posePreset?: PosePreset;
};

type AvatarPreviewSummary = {
  status: "not_started" | "queued" | "generating" | "ready" | "failed";
  jobId: string | null;
  previewId: string | null;
  imageUrl: string | null;
  cacheKey: string | null;
  errorMessage: string | null;
  accuracyLevel?: FitEvaluation["accuracyLevel"];
  fitStatus?: string;
  fitConfidence?: number;
  fitWarnings?: string[];
  groundedItemIds?: string[];
  missingVisualItemIds?: string[];
  visualizationWarnings?: string[];
  footwearIncluded?: boolean;
  visualGroundingStatus?: string;
  progressiveTrigger?: ReturnType<typeof serializeProgressiveTrigger> | null;
  setupPath?: string | null;
};

export type StylistVisualizationResult = {
  visualMode: StylistVisualMode;
  outfitRecommendationId: string | null;
  avatarPreview: AvatarPreviewSummary;
  visualizationDisclaimer: string;
  fitLock?: {
    fitStatus: string;
    fitConfidence: number;
    warnings: string[];
    lockedFitInstructions: string[];
    accuracyLevel: FitEvaluation["accuracyLevel"];
  };
  job?: ReturnType<typeof serializeJob>;
};

type PersistedStylistOutfit = {
  outfit: any;
  items: any[];
  outfitRecommendationId: string;
  serializedOutfit: ReturnType<typeof serializeOutfit>;
};

type StylistVisualizationSerializeInput = Omit<Partial<StylistVisualizationResult>, "job"> & {
  job?: any;
};

function defaultAvatarPreview(patch: Partial<AvatarPreviewSummary> = {}): AvatarPreviewSummary {
  return {
    status: "not_started",
    jobId: null,
    previewId: null,
    imageUrl: null,
    cacheKey: null,
    errorMessage: null,
    ...patch
  };
}

function fitLockSummary(fitEvaluation?: FitEvaluation) {
  if (!fitEvaluation) return undefined;
  return {
    fitStatus: fitEvaluation.fitStatus,
    fitConfidence: fitEvaluation.fitConfidence,
    warnings: fitEvaluation.warnings,
    lockedFitInstructions: fitEvaluation.lockedFitInstructions,
    accuracyLevel: fitEvaluation.accuracyLevel
  };
}

function outOfCreditsVisualization(visualMode: StylistVisualMode, outfitRecommendationId: string, patch: Partial<AvatarPreviewSummary> = {}) {
  return serializeStylistVisualization({
    visualMode,
    outfitRecommendationId,
    avatarPreview: defaultAvatarPreview({
      status: "failed",
      errorMessage: "You're out of Credits. Purchase more Credits to continue.",
      ...patch
    })
  });
}

async function ensureVisualizationCredits(userId: string, feature: CreditFeature) {
  try {
    await ensureCreditsForFeature(userId, feature);
    return true;
  } catch (error) {
    if (error instanceof InsufficientCreditsError) return false;
    throw error;
  }
}

function previewFitPatch(fitEvaluation?: FitEvaluation): Partial<AvatarPreviewSummary> {
  if (!fitEvaluation) return {};
  return {
    accuracyLevel: fitEvaluation.accuracyLevel,
    fitStatus: fitEvaluation.fitStatus,
    fitConfidence: fitEvaluation.fitConfidence,
    fitWarnings: fitEvaluation.warnings
  };
}

function previewGroundingPatch(items: any[], preview?: any): Partial<AvatarPreviewSummary> {
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

function cleanText(value: unknown, max = 220) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function referenceItemIdsFromRecommendation(recommendationResult: any) {
  const fromItems = Array.isArray(recommendationResult?.referenceItems)
    ? recommendationResult.referenceItems.map((item: any) => String(item?.id || item?._id || "")).filter(Boolean)
    : [];
  const fromPieces = Array.isArray(recommendationResult?.outfitPieces)
    ? recommendationResult.outfitPieces
        .filter((piece: any) => piece?.source === "reference-upload")
        .map((piece: any) => String(piece.referenceItemId || ""))
        .filter(Boolean)
    : [];
  return Array.from(new Set([...fromItems, ...fromPieces])).slice(0, 4);
}

function reuseKeyFor(userId: string, itemIds: string[], occasion: string, referenceItemIds: string[] = []) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      userId,
      itemIds: itemIds.map(String).sort(),
      occasion: cleanText(occasion, 80).toLowerCase(),
      referenceItemIds: referenceItemIds.map(String).sort()
    }))
    .digest("hex")
    .slice(0, 64);
}

async function markPremiumPreviewStatus(
  userId: string,
  outfitId: string,
  cacheKey: string,
  patch: Record<string, unknown>,
  incrementAttempt = false
) {
  const update: Record<string, unknown> = { $set: patch };
  if (incrementAttempt) update.$inc = { attempts: 1 };

  const preview = await OutfitPreview.findOneAndUpdate(
    { userId, outfitId, cacheKey },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const outfitUpdate: Record<string, unknown> = {
    $set: Object.fromEntries(Object.entries(patch).map(([key, value]) => [`preview.${key}`, value]))
  };
  if (incrementAttempt) outfitUpdate.$inc = { "preview.attempts": 1 };
  await OutfitRecommendation.findOneAndUpdate({ _id: outfitId, userId }, outfitUpdate);

  return preview;
}

export function shouldGenerateVisualization(
  intent: StylistIntent,
  userMessage: string,
  options: StylistVisualizationOptions = {}
) {
  if (options.includeVisualization === false || options.visualMode === "none") return false;
  if (!options.hasOutfit) return false;

  const allowedIntent =
    intent === "outfit_request" ||
    intent === "improve_outfit" ||
    intent === "packing_help";

  if (intent === "shopping_advice_requested" || intent === "general_style_advice" || intent === "wardrobe_gap" || intent === "unclear") {
    return false;
  }

  const text = userMessage.toLowerCase();
  const stylingText = /(style me|what should i wear|build|look|outfit|wear|church|wedding|date|dinner|party|event|gala|business casual|vacation)/.test(text);
  return allowedIntent || (options.includeVisualization === true && stylingText);
}

export async function createOrReuseStylistOutfitRecommendation(
  userId: string,
  recommendationResult: any,
  stylistContext: {
    ownedItemIds?: string[];
    requestText?: string;
    source?: "stylist_chat" | "system";
  } = {}
): Promise<PersistedStylistOutfit | null> {
  const owned = new Set((stylistContext.ownedItemIds || []).map(String));
  const items = (recommendationResult?.items || [])
    .filter((item: any) => {
      const id = itemId(item);
      return id && (!owned.size || owned.has(id));
    });

  const itemIds: string[] = Array.from(new Set<string>(items.map(itemId).filter(Boolean)));
  if (!itemIds.length) return null;

  const occasion = cleanText(recommendationResult?.occasion || "Today", 80) || "Today";
  const referenceItemIds = referenceItemIdsFromRecommendation(recommendationResult);
  const reuseKey = reuseKeyFor(userId, itemIds, occasion, referenceItemIds);
  const requestText = cleanText(stylistContext.requestText, 220);
  const source = stylistContext.source || "stylist_chat";

  const outfit = await OutfitRecommendation.findOneAndUpdate(
    { userId, source, reuseKey },
    {
      $setOnInsert: {
        userId,
        title: cleanText(recommendationResult?.title || `${occasion} outfit`, 120),
        occasion,
        itemIds,
        referenceItemIds,
        outfitPieces: Array.isArray(recommendationResult?.outfitPieces) ? recommendationResult.outfitPieces.slice(0, 12) : [],
        referenceItems: Array.isArray(recommendationResult?.referenceItems) ? recommendationResult.referenceItems.slice(0, 4) : [],
        confidence: recommendationResult?.confidence || "Needs review",
        reasonChips: recommendationResult?.reasonChips || [],
        summary: cleanText(recommendationResult?.summary || "", 900),
        weatherContext: cleanText(recommendationResult?.weatherContext || "", 160),
        repetitionNote: cleanText(recommendationResult?.repetitionNote || "", 260),
        careNote: cleanText(recommendationResult?.careNote || "", 260),
        colorNote: cleanText(recommendationResult?.colorNote || "", 260),
        occasionFit: cleanText(recommendationResult?.occasionFit || "", 360),
        whyItWorks: cleanText(recommendationResult?.whyItWorks || "", 500),
        materialNote: cleanText(recommendationResult?.materialNote || "", 360),
        silhouetteNote: cleanText(recommendationResult?.silhouetteNote || "", 360),
        improvementNote: cleanText(recommendationResult?.improvementNote || "", 360),
        addLater: cleanText(recommendationResult?.addLater || "", 240),
        stylingTips: Array.isArray(recommendationResult?.stylingTips)
          ? recommendationResult.stylingTips.map((tip: unknown) => cleanText(tip, 180)).filter(Boolean).slice(0, 8)
          : [],
        recommendationMode: cleanText(recommendationResult?.recommendationMode || "todays_best", 80) || "todays_best",
        styleIntent: cleanText(recommendationResult?.styleIntent || "", 120),
        freshnessCue: cleanText(recommendationResult?.freshnessCue || "", 180),
        wardrobeReadiness: recommendationResult?.wardrobeReadiness || null,
        gapInsights: Array.isArray(recommendationResult?.gapInsights) ? recommendationResult.gapInsights.slice(0, 6) : [],
        scoreBreakdown: recommendationResult?.scoreBreakdown || {},
        similarityMetadata: recommendationResult?.similarityMetadata || {},
        candidateCount: Number(recommendationResult?.candidateCount || 0),
        diverseCandidateCount: Number(recommendationResult?.diverseCandidateCount || 0),
        alternatives: Array.isArray(recommendationResult?.alternatives) ? recommendationResult.alternatives.slice(0, 4) : [],
        confidenceScore: Math.max(0, Math.min(1, Number(recommendationResult?.confidenceScore || 0))),
        completenessStatus: recommendationResult?.completenessStatus || "missing_core_item",
        missingCategories: Array.isArray(recommendationResult?.missingCategories) ? recommendationResult.missingCategories.slice(0, 8) : [],
        completenessWarnings: Array.isArray(recommendationResult?.completenessWarnings)
          ? recommendationResult.completenessWarnings.map((warning: unknown) => cleanText(warning, 220)).filter(Boolean).slice(0, 8)
          : [],
        footwearIncluded: Boolean(recommendationResult?.footwearIncluded),
        swapGroups: recommendationResult?.swapGroups || [],
        source,
        requestText,
        reuseKey,
        reasoningMetadata: {
          generatedBy: "stylist_visualization_orchestrator",
          visualSource: "stylist_chat",
          deterministicConfidence: recommendationResult?.confidenceScore || 0,
          recommendationMode: recommendationResult?.recommendationMode || "todays_best",
          styleIntent: recommendationResult?.styleIntent || "",
          freshnessCue: recommendationResult?.freshnessCue || "",
          wardrobeReadiness: recommendationResult?.wardrobeReadiness || null,
          gapInsights: recommendationResult?.gapInsights || [],
          scoreBreakdown: recommendationResult?.scoreBreakdown || {},
          similarityMetadata: recommendationResult?.similarityMetadata || {},
          candidateCount: recommendationResult?.candidateCount || 0,
          diverseCandidateCount: recommendationResult?.diverseCandidateCount || 0,
          alternatives: recommendationResult?.alternatives || [],
          itemCount: itemIds.length,
          referenceItemIds,
          outfitPieces: Array.isArray(recommendationResult?.outfitPieces) ? recommendationResult.outfitPieces.slice(0, 12) : [],
          referenceItems: Array.isArray(recommendationResult?.referenceItems) ? recommendationResult.referenceItems.slice(0, 4) : []
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return {
    outfit,
    items,
    outfitRecommendationId: String(outfit._id),
    serializedOutfit: serializeOutfit(outfit, items)
  };
}

async function triggerPremiumPreviewForStylist(
  userId: string,
  outfitRecommendationId: string,
  options: StylistVisualizationOptions = {}
): Promise<StylistVisualizationResult> {
  const visualMode: StylistVisualMode = "premium_preview";

  if (!process.env.OPENAI_API_KEY) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "failed",
        errorMessage: "Premium image generation is not configured yet."
      })
    });
  }

  const loaded = await loadOwnedPreviewSubject(userId, outfitRecommendationId);
  if (!loaded || loaded.missingItems) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "failed",
        errorMessage: "This premium preview needs all selected owned wardrobe items available."
      })
    });
  }

  const previewOptions = { style: "luxury_lookbook" as const };
  const cacheKey = buildPreviewCacheKeyFromItems(userId, outfitRecommendationId, loaded.items, previewOptions);
  const cached = options.regenerate ? null : await getCachedOutfitPreview(userId, outfitRecommendationId, cacheKey) as any;

  if (cached?.imageUrl) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "ready",
        previewId: String(cached._id),
        imageUrl: cached.imageUrl,
        cacheKey
      })
    });
  }

  const inFlight = await OutfitPreview.findOne({
    userId,
    outfitId: outfitRecommendationId,
    cacheKey,
    status: "generating",
    lastAttemptAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
  }).lean() as any;

  if (inFlight && !options.regenerate) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "generating",
        previewId: String(inFlight._id),
        imageUrl: inFlight.imageUrl || null,
        cacheKey
      })
    });
  }

  const creditFeature: CreditFeature = options.regenerate ? "regenerate_try_on" : "outfit_preview";
  const hasCredits = await ensureVisualizationCredits(userId, creditFeature);
  if (!hasCredits) return outOfCreditsVisualization(visualMode, outfitRecommendationId, { cacheKey });

  const previewRecord = await markPremiumPreviewStatus(
    userId,
    outfitRecommendationId,
    cacheKey,
    {
      userId,
      outfitId: loaded.outfit._id,
      cacheKey,
      status: "generating",
      provider: "s3",
      promptVersion: previewPromptVersion,
      model: getAiModel("imageGeneration"),
      errorMessage: "",
      lastAttemptAt: new Date()
    },
    true
  );
  const previewRecordId = (previewRecord as any)?._id ? String((previewRecord as any)._id) : null;

  if (backgroundJobsEnabled()) {
    const job = await enqueueJob(
      "outfit_preview_generation",
      {
        outfitId: outfitRecommendationId,
        style: previewOptions.style,
        cacheKey,
        creditFeature,
        source: "stylist_chat",
        visualMode
      },
      {
        userId,
        maxAttempts: 3
      }
    );

    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "queued",
        jobId: String(job._id),
        previewId: previewRecordId,
        cacheKey
      }),
      job
    });
  }

  try {
    const generated = await generatePremiumOutfitPreview(userId, loaded.outfit, loaded.items, previewOptions);
    const saved = await saveGeneratedPreview(userId, outfitRecommendationId, generated, cacheKey);
    await spendCreditsAfterSuccess({
      userId,
      feature: creditFeature,
      referenceId: `stylist-preview:${outfitRecommendationId}:${cacheKey}`,
      metadata: { source: "stylist_chat", visualMode }
    });
    const preview = serializeOutfitPreview(saved);

    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "ready",
        previewId: preview.id || null,
        imageUrl: preview.imageUrl || preview.previewUrl || null,
        cacheKey
      })
    });
  } catch {
    await markPremiumPreviewStatus(
      userId,
      outfitRecommendationId,
      cacheKey,
      {
        status: "failed",
        errorMessage: "Unable to generate premium preview right now.",
        lastAttemptAt: new Date()
      }
    );

    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "failed",
        previewId: previewRecordId,
        cacheKey,
        errorMessage: "Unable to generate premium preview right now."
      })
    });
  }
}

export async function triggerDigitalHumanPreviewForStylist(
  userId: string,
  outfitRecommendationId: string,
  options: StylistVisualizationOptions = {}
): Promise<StylistVisualizationResult> {
  const visualMode: StylistVisualMode = options.visualMode || "digital_human";
  if (visualMode === "premium_preview") {
    return triggerPremiumPreviewForStylist(userId, outfitRecommendationId, options);
  }

  if (visualMode !== "digital_human") {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview()
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "failed",
        errorMessage: "Avatar preview is not configured yet."
      })
    });
  }

  const loaded = await loadOwnedAvatarPreviewSubject(userId, outfitRecommendationId);
  if (!loaded || loaded.missingItems) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "failed",
        errorMessage: "This avatar preview needs all selected owned wardrobe items available."
      })
    });
  }

  const tryOnSetupTrigger = triggerForVirtualTryOn(loaded.avatarProfile);
  if (tryOnSetupTrigger) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "failed",
        errorMessage: "Set up your try-on model before generating this preview.",
        progressiveTrigger: serializeProgressiveTrigger(tryOnSetupTrigger),
        setupPath: "/avatar"
      })
    });
  }

  const fitEvaluation = evaluateOutfitFitOnAvatar(loaded.avatarProfile, loaded.items);
  const groundingPatch = previewGroundingPatch(loaded.items);
  const previewOptions = {
    visualizationStyle: options.visualizationStyle || loaded.avatarProfile.visualizationStyle || "luxury",
    posePreset: options.posePreset || loaded.avatarProfile.posePreset || "standing"
  };
  const cacheKey = buildAvatarCacheKeyFromItems(userId, outfitRecommendationId, loaded.items, loaded.avatarProfile, previewOptions);
  const cached = options.regenerate ? null : await getCachedAvatarPreview(userId, outfitRecommendationId, cacheKey) as any;

  if (cached?.imageUrl) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "ready",
        previewId: String(cached._id),
        imageUrl: cached.imageUrl,
        cacheKey,
        ...previewFitPatch(fitEvaluation),
        ...previewGroundingPatch(loaded.items, cached)
      }),
      fitLock: fitLockSummary(fitEvaluation)
    });
  }

  const inFlight = await AvatarOutfitPreview.findOne({
    userId,
    outfitId: outfitRecommendationId,
    cacheKey,
    status: "generating",
    lastAttemptAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
  }).lean() as any;

  if (inFlight && !options.regenerate) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "generating",
        previewId: String(inFlight._id),
        imageUrl: inFlight.imageUrl || null,
        cacheKey,
        ...previewFitPatch(fitEvaluation),
        ...previewGroundingPatch(loaded.items, inFlight)
      }),
      fitLock: fitLockSummary(fitEvaluation)
    });
  }

  const creditFeature: CreditFeature = options.regenerate ? "regenerate_try_on" : "virtual_try_on";
  const hasCredits = await ensureVisualizationCredits(userId, creditFeature);
  if (!hasCredits) {
    return outOfCreditsVisualization(visualMode, outfitRecommendationId, {
      cacheKey,
      ...previewFitPatch(fitEvaluation),
      ...groundingPatch
    });
  }

  const activeGeneration = await findActiveTryOnGeneration({ userId, outfitId: outfitRecommendationId, cacheKey, creditFeature }).lean() as any;
  if (activeGeneration && isActiveTryOnGenerationStatus(activeGeneration.status)) {
    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: activeGeneration.status === "queued" ? "queued" : "generating",
        previewId: activeGeneration.previewId ? String(activeGeneration.previewId) : null,
        cacheKey,
        ...previewFitPatch(fitEvaluation),
        ...groundingPatch
      }),
      fitLock: fitLockSummary(fitEvaluation)
    });
  }

  const idempotencyKey = createTryOnIdempotencyKey({
    source: "stylist-tryon",
    userId,
    outfitId: outfitRecommendationId,
    cacheKey,
    regenerate: options.regenerate
  });
  let generationResult = await getOrCreateTryOnGeneration({
    userId,
    outfitId: loaded.outfit._id,
    avatarProfileId: loaded.avatarProfile._id,
    cacheKey,
    creditFeature,
    idempotencyKey,
    provider: process.env.TRYON_PROVIDER || "internal_preview",
    metadata: { source: "stylist_chat", visualMode }
  });
  let generation: any = generationResult.generation;

  if (generationResult.reused && generation.status === "failed") {
    generationResult = await getOrCreateTryOnGeneration({
      userId,
      outfitId: loaded.outfit._id,
      avatarProfileId: loaded.avatarProfile._id,
      cacheKey,
      creditFeature,
      idempotencyKey: createTryOnIdempotencyKey({ source: "stylist-tryon", userId, outfitId: outfitRecommendationId, cacheKey, regenerate: true }),
      provider: process.env.TRYON_PROVIDER || "internal_preview",
      metadata: { source: "stylist_chat", visualMode, retryOf: generation.generationId }
    });
    generation = generationResult.generation;
  }

  if (generationResult.reused && generation.status === "completed") {
    const completedPreview = await AvatarOutfitPreview.findOne({ userId, outfitId: outfitRecommendationId, cacheKey, status: "ready", imageUrl: { $ne: "" }, storageKey: { $ne: "" } }).lean() as any;
    if (completedPreview?.imageUrl) {
      const preview = serializeAvatarPreview({ ...completedPreview, cached: true });
      return serializeStylistVisualization({
        visualMode,
        outfitRecommendationId,
        avatarPreview: defaultAvatarPreview({
          status: "ready",
          previewId: preview.id || null,
          imageUrl: preview.imageUrl || preview.previewUrl || null,
          cacheKey,
          ...previewFitPatch(fitEvaluation),
          ...previewGroundingPatch(loaded.items, preview)
        }),
        fitLock: fitLockSummary(fitEvaluation)
      });
    }
  }

  try {
    await reserveTryOnGenerationCredits(generation);
  } catch {
    return outOfCreditsVisualization(visualMode, outfitRecommendationId, {
      cacheKey,
      ...previewFitPatch(fitEvaluation),
      ...groundingPatch
    });
  }

  const previewRecord = await markAvatarPreviewStatus(
    userId,
    outfitRecommendationId,
    String(loaded.avatarProfile._id),
    cacheKey,
    {
      userId,
      outfitId: loaded.outfit._id,
      avatarProfileId: loaded.avatarProfile._id,
      itemIds: loaded.itemIds,
      cacheKey,
      generationId: generation.generationId,
      idempotencyKey,
      creditReferenceId: generation.creditReferenceId,
      billingStatus: "reserved",
      status: "generating",
      provider: "s3",
      promptVersion: avatarPreviewPromptVersion,
      model: getAiModel("imageGeneration"),
      visualizationStyle: previewOptions.visualizationStyle,
      posePreset: previewOptions.posePreset,
      accuracyLevel: fitEvaluation.accuracyLevel.id,
      fitStatus: fitEvaluation.fitStatus,
      fitConfidence: fitEvaluation.fitConfidence,
      fitWarnings: fitEvaluation.warnings,
      fitLockInstructions: fitEvaluation.lockedFitInstructions,
      groundedItemIds: groundingPatch.groundedItemIds,
      missingVisualItemIds: groundingPatch.missingVisualItemIds,
      visualizationWarnings: groundingPatch.visualizationWarnings,
      footwearIncluded: groundingPatch.footwearIncluded,
      visualGroundingStatus: groundingPatch.visualGroundingStatus,
      errorMessage: "",
      lastAttemptAt: new Date()
    },
    true
  );
  const previewRecordId = (previewRecord as any)?._id ? String((previewRecord as any)._id) : null;

  if (backgroundJobsEnabled()) {
    generation = await markTryOnGenerationStage(generation.generationId, "queued", { previewId: (previewRecord as any)?._id || null }) || generation;
    const job = await enqueueJob(
      "avatar_preview_generation",
      {
        outfitId: outfitRecommendationId,
        avatarProfileId: String(loaded.avatarProfile._id),
        visualizationStyle: previewOptions.visualizationStyle,
        posePreset: previewOptions.posePreset,
        wardrobeItemIds: loaded.itemIds,
        cacheKey,
        creditFeature,
        generationId: generation.generationId,
        idempotencyKey,
        creditReferenceId: generation.creditReferenceId,
        source: "stylist_chat",
        visualMode
      },
      {
        userId,
        maxAttempts: 3
      }
    );

    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "queued",
        jobId: String(job._id),
        previewId: previewRecordId,
        cacheKey,
        ...previewFitPatch(fitEvaluation),
        ...groundingPatch
      }),
      fitLock: fitLockSummary(fitEvaluation),
      job
    });
  }

  try {
    generation = await markTryOnGenerationStage(generation.generationId, "submitting", { previewId: (previewRecord as any)?._id || null }) || generation;
    const result = await runConfiguredVirtualTryOnJob({
      userId,
      outfitId: outfitRecommendationId,
      avatarProfileId: String(loaded.avatarProfile._id),
      wardrobeItemIds: loaded.itemIds,
      desiredView: previewOptions.posePreset === "walking" ? "walking" : undefined,
      visualizationStyle: previewOptions.visualizationStyle,
      posePreset: previewOptions.posePreset,
      cacheKey
    });
    const saved = (result.preview as any)?.toObject?.() ?? result.preview;
    if (!saved) throw new Error("Virtual try-on is not ready yet.");
    generation = await markTryOnGenerationStage(generation.generationId, "provider_completed", {
      providerJobId: result.providerOutput?.jobId || "",
      providerDiagnostics: { status: result.providerOutput?.status || "", warningCount: result.providerOutput?.warnings?.length || 0 }
    }) || generation;
    if (!result.cached) {
      const committed = await commitTryOnGenerationCredits({
        generation,
        preview: saved,
        metadata: { source: "stylist_chat", visualMode }
      });
      generation = committed.generation;
      await markAvatarPreviewStatus(userId, outfitRecommendationId, String(loaded.avatarProfile._id), cacheKey, { billingStatus: "committed", generationId: generation.generationId });
    }
    const preview = serializeAvatarPreview(saved);

    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "ready",
        previewId: preview.id || null,
        imageUrl: preview.imageUrl || preview.previewUrl || null,
        cacheKey,
        ...previewFitPatch(fitEvaluation),
        ...previewGroundingPatch(loaded.items, preview)
      }),
      fitLock: fitLockSummary(fitEvaluation)
    });
  } catch (error) {
    await markAvatarPreviewStatus(
      userId,
      outfitRecommendationId,
      String(loaded.avatarProfile._id),
      cacheKey,
      {
        status: "failed",
        billingStatus: "released",
        errorMessage: "Virtual Try-On could not be completed. Your credit was not deducted.",
        lastAttemptAt: new Date()
      }
    );
    await failTryOnGeneration({ generation, stage: "stylist_tryon", code: "stylist_tryon_failed", error });

    return serializeStylistVisualization({
      visualMode,
      outfitRecommendationId,
      avatarPreview: defaultAvatarPreview({
        status: "failed",
        previewId: previewRecordId,
        cacheKey,
        errorMessage: "Virtual Try-On could not be completed. Your credit was not deducted.",
        ...previewFitPatch(fitEvaluation),
        ...groundingPatch
      }),
      fitLock: fitLockSummary(fitEvaluation)
    });
  }
}

export function serializeStylistVisualization(result?: StylistVisualizationSerializeInput): StylistVisualizationResult {
  return {
    visualMode: result?.visualMode || "none",
    outfitRecommendationId: result?.outfitRecommendationId || null,
    avatarPreview: defaultAvatarPreview(result?.avatarPreview || {}),
    visualizationDisclaimer: result?.visualizationDisclaimer || stylistVisualizationDisclaimer,
    ...(result?.fitLock ? { fitLock: result.fitLock } : {}),
    ...(result?.job ? { job: serializeJob(result.job) } : {})
  };
}
