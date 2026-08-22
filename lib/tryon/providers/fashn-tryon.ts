import { preferredTryOnModelImageUrl } from "@/lib/avatar/avatar-profile";
import { errorCategory, logAiEvent } from "@/lib/ai/observability/ai-logger";
import { loadOwnedAvatarPreviewSubject } from "@/lib/avatar/avatar-preview";
import { getPreviewAccuracyLevel } from "@/lib/preview/preview-accuracy";
import { preferredTryOnProductReferenceUrl, preferredVisualReferenceUrl } from "@/lib/preview/visual-grounding";
import { uploadGeneratedImage, uploadGeneratedImageFromUrl } from "@/lib/storage/generated-images";
import type { TryOnProvider, TryOnPreviewInput, TryOnProviderOutput } from "@/lib/tryon/types";
import { prepareTryOnItems, tryOnVisualRoleForItem, type TryOnVisualRole } from "@/lib/tryon/provider-capabilities";
import { logTryOnMetric } from "@/lib/tryon/reliability";
import { validateTryOnVisualIntegrity, type TryOnIntegrityItem, type TryOnIntegrityResult } from "@/lib/tryon/visual-integrity";
import { AvatarProfile } from "@/models/AvatarProfile";

type FashnStatus = "starting" | "in_queue" | "processing" | "completed" | "failed" | string;

type FashnRunResponse = {
  id?: string;
  error?: unknown;
  message?: string;
};

type FashnStatusResponse = {
  id?: string;
  status?: FashnStatus;
  output?: string[];
  error?: { name?: string; message?: string } | string | null;
};

type FashnDiagnostics = {
  provider: "fashn";
  stage: string;
  modelName: string;
  stepIndex?: number;
  httpStatus?: number;
  safeReason: string;
  providerReturnedJobId?: boolean;
  modelImagePresent?: boolean;
  productImagePresent?: boolean;
  modelImageHost?: string;
  productImageHost?: string;
  outputCount?: number;
  providerStatus?: string;
  retryCount?: number;
  providerJobId?: string;
};

function config() {
  const baseUrl = (process.env.FASHN_BASE_URL || "https://api.fashn.ai/v1").replace(/\/$/, "");
  return {
    apiKey: process.env.FASHN_API_KEY || process.env.TRYON_FASHN_API_KEY || "",
    runEndpoint: process.env.FASHN_RUN_ENDPOINT || `${baseUrl}/run`,
    statusEndpoint: process.env.FASHN_STATUS_ENDPOINT || `${baseUrl}/status`,
    modelName: process.env.FASHN_MODEL_NAME || "tryon-max",
    resolution: process.env.FASHN_RESOLUTION || "2k",
    generationMode: process.env.FASHN_GENERATION_MODE || "quality",
    outputFormat: process.env.FASHN_OUTPUT_FORMAT || "png",
    returnBase64: process.env.FASHN_RETURN_BASE64 !== "false",
    maxOutfitItems: Math.max(1, Math.min(Number(process.env.FASHN_MAX_OUTFIT_ITEMS || 6), 10)),
    timeoutMs: Math.max(15000, Math.min(Number(process.env.FASHN_TIMEOUT_MS || process.env.TRYON_TIMEOUT_MS || 90000), 180000)),
    pollMs: Math.max(1500, Math.min(Number(process.env.FASHN_POLL_MS || 2000), 10000))
  };
}

function unavailable(message: string): TryOnProviderOutput {
  return {
    status: "provider_unavailable",
    provider: "fashn",
    previewUrls: [],
    animationUrl: null,
    modelUrl: null,
    accuracyLevel: getPreviewAccuracyLevel("garment_referenced"),
    warnings: [message]
  };
}

function safeImageHost(value?: string) {
  if (!value) return "";
  if (value.startsWith("data:image/")) return "base64-image";
  try {
    const url = new URL(value);
    return url.hostname.slice(0, 120);
  } catch {
    return "invalid-url";
  }
}

function safeReasonFromStatus(status: number, bodyText = "") {
  const body = bodyText.toLowerCase();
  if (status === 401 || status === 403) return "auth_failed";
  if (status === 402 || /credit|balance|payment|quota/.test(body)) return "provider_credits_or_quota";
  if (status === 408 || /timeout/.test(body)) return "provider_timeout";
  if (status === 409) return "provider_conflict";
  if (status === 413 || /too large|payload/.test(body)) return "image_too_large";
  if (status === 415 || /content.type|mime|format|unsupported/.test(body)) return "unsupported_image_format";
  if (status === 422 || /pose|image|url|model|product|garment/.test(body)) return "invalid_or_unreachable_image";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_unavailable";
  if (status >= 400) return "invalid_request";
  return "unknown_provider_response";
}

function safeReasonFromProviderPayload(payload: FashnRunResponse | FashnStatusResponse) {
  const text = JSON.stringify(payload).toLowerCase();
  if (/credit|balance|payment|quota/.test(text)) return "provider_credits_or_quota";
  if (/auth|api.?key|token|permission|forbidden|unauthorized/.test(text)) return "auth_failed";
  if (/pose|image|url|model|product|garment/.test(text)) return "invalid_or_unreachable_image";
  if (/rate|limit|too many/.test(text)) return "rate_limited";
  if (/timeout|temporary|unavailable/.test(text)) return "provider_unavailable";
  return "provider_rejected_request";
}

function diagnostics(input: {
  stage: string;
  modelName: string;
  stepIndex?: number;
  httpStatus?: number;
  safeReason: string;
  providerReturnedJobId?: boolean;
  modelImage?: string;
  productImage?: string;
  outputCount?: number;
  providerStatus?: string;
  retryCount?: number;
  providerJobId?: string;
}): FashnDiagnostics {
  return {
    provider: "fashn",
    stage: input.stage,
    modelName: input.modelName,
    stepIndex: input.stepIndex,
    httpStatus: input.httpStatus,
    safeReason: input.safeReason,
    providerReturnedJobId: input.providerReturnedJobId,
    modelImagePresent: Boolean(input.modelImage),
    productImagePresent: Boolean(input.productImage),
    modelImageHost: safeImageHost(input.modelImage),
    productImageHost: safeImageHost(input.productImage),
    outputCount: input.outputCount,
    providerStatus: input.providerStatus,
    retryCount: input.retryCount,
    providerJobId: input.providerJobId ? input.providerJobId.slice(0, 160) : undefined
  };
}

function logFashnDiagnostic(event: string, diagnostic: FashnDiagnostics) {
  console.info("fitpick.tryon.provider", {
    event,
    ...diagnostic,
    timestamp: new Date().toISOString()
  });
}

function unavailableWithDiagnostics(message: string, providerDiagnostics: FashnDiagnostics): TryOnProviderOutput {
  return {
    ...unavailable(message),
    providerDiagnostics
  };
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(baseMs: number, attempt: number) {
  const exponential = Math.min(12000, baseMs * Math.pow(1.6, attempt));
  const jitter = Math.floor(Math.random() * Math.min(1000, baseMs));
  return exponential + jitter;
}

function normalizeStatus(status?: FashnStatus): TryOnProviderOutput["status"] {
  if (status === "completed") return "ready";
  if (status === "starting" || status === "in_queue") return "queued";
  if (status === "processing") return "processing";
  if (status === "failed") return "failed";
  return "processing";
}

function errorMessage(error: FashnStatusResponse["error"] | FashnRunResponse["error"]) {
  if (!error) return "";
  return "Virtual Try-On could not be completed.";
}

function rankedProductImages(items: any[]) {
  // prepareTryOnItems already applies the provider-aware, deterministic order.
  // Preserve it so a locked Match reference is always sent before supporting pieces.
  return items.map((item) => ({
    item,
    id: String(item?._id || item?.id || ""),
    role: tryOnVisualRoleForItem(item),
    url: preferredTryOnProductReferenceUrl(item),
    validationUrl: preferredVisualReferenceUrl(item)
  })).filter((entry): entry is typeof entry & { url: string; validationUrl: string; role: TryOnVisualRole } => Boolean(entry.url && entry.validationUrl && entry.role));
}

function isProviderImage(value: string) {
  return /^https:\/\//i.test(value) || /^data:image\//i.test(value) || /^[A-Za-z0-9+/]+=*$/i.test(value.slice(0, 80));
}

async function preflightImage(value: string, source: "model" | "product") {
  if (!/^https:\/\//i.test(value)) return isProviderImage(value);
  try {
    const response = await fetch(value, {
      method: "GET",
      headers: { range: "bytes=0-0" },
      signal: AbortSignal.timeout(8000)
    });
    const contentType = response.headers.get("content-type") || "";
    await response.body?.cancel().catch(() => undefined);
    const ready = response.ok && /^image\/(png|jpe?g|webp)/i.test(contentType);
    console.info("fitpick.tryon.preflight", {
      source,
      host: safeImageHost(value),
      status: ready ? "ready" : "failed",
      httpStatus: response.status,
      timestamp: new Date().toISOString()
    });
    return ready;
  } catch {
    console.info("fitpick.tryon.preflight", {
      source,
      host: safeImageHost(value),
      status: "failed",
      httpStatus: 0,
      timestamp: new Date().toISOString()
    });
    return false;
  }
}

const CORE_ROLES = new Set<TryOnVisualRole>(["upperBody", "lowerBody", "onePiece"]);
const SAFE_SINGLE_REPAIR_ROLES = new Set<TryOnVisualRole>(["upperBody", "lowerBody", "onePiece", "outerwear", "footwear"]);

export function selectSingleIntegrityRepairIndex(
  products: Array<{ id: string; role: TryOnVisualRole }>,
  integrity: Pick<TryOnIntegrityResult, "safeReason" | "missingItemIds" | "mismatchedItemIds">
) {
  if (integrity.safeReason === "visual_quality_failed") return -1;
  const invalidIds = new Set([...integrity.missingItemIds, ...integrity.mismatchedItemIds]);
  const outerwearPresent = products.some((product) => product.role === "outerwear");
  return products.findIndex((product) =>
    invalidIds.has(product.id)
    && SAFE_SINGLE_REPAIR_ROLES.has(product.role)
    && !(outerwearPresent && product.role === "upperBody")
  );
}

async function publishProgress(input: TryOnPreviewInput, output: TryOnProviderOutput) {
  if (!input.onProgress) return;
  const startedAt = Date.now();
  try {
    await input.onProgress(output);
    logTryOnMetric({
      metric: "progress_persisted",
      stage: output.progressStage,
      status: "success",
      durationMs: Date.now() - startedAt,
      metadata: { completedItemCount: output.providerCompletedItemIds?.length || 0, pendingItemCount: output.pendingItemIds?.length || 0 }
    });
  } catch {
    logTryOnMetric({
      metric: "progress_persisted",
      stage: output.progressStage,
      status: "failed",
      durationMs: Date.now() - startedAt,
      errorCode: "progress_persistence_failed"
    });
  }
}

async function outputToPersistedImages(input: TryOnPreviewInput, output: string[] = []) {
  const urls: string[] = [];
  const storageKeys: string[] = [];
  for (const value of output) {
    if (!value) continue;
    if (/^data:image\/|^[A-Za-z0-9+/]+=*$/i.test(value.slice(0, 80)) && input.outfitRecommendationId) {
      const uploaded = await uploadGeneratedImage(value, {
        userId: input.userId,
        outfitId: input.outfitRecommendationId,
        cacheKey: input.cacheKey || `fashn-${Date.now()}`,
        contentType: value.startsWith("data:image/jpeg") ? "image/jpeg" : "image/png",
        format: value.startsWith("data:image/jpeg") ? "jpeg" : "png",
        width: 1024,
        height: 1024
      });
      urls.push(uploaded.url);
      storageKeys.push(uploaded.storageKey);
      continue;
    }
    if (/^https:\/\//i.test(value) && input.outfitRecommendationId) {
      const uploaded = await uploadGeneratedImageFromUrl(value, {
        userId: input.userId,
        outfitId: input.outfitRecommendationId,
        cacheKey: input.cacheKey || `fashn-${Date.now()}`,
        width: 1024,
        height: 1024
      });
      urls.push(uploaded.url);
      storageKeys.push(uploaded.storageKey);
    }
  }
  return { urls, storageKeys };
}

async function runFashnTryOnStep(input: TryOnPreviewInput, payload: {
  productImage: string;
  modelImage: string;
  prompt: string;
  stepIndex: number;
  role: TryOnVisualRole;
  modelName: string;
  mode: string;
}) {
  const providerConfig = config();
  const inputs = {
    product_image: payload.productImage,
    model_image: payload.modelImage,
    prompt: payload.prompt,
    resolution: providerConfig.resolution,
    generation_mode: payload.mode,
    output_format: providerConfig.outputFormat,
    return_base64: providerConfig.returnBase64
  };
  const response = await fetch(providerConfig.runEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerConfig.apiKey}`
    },
    body: JSON.stringify({
      model_name: payload.modelName,
      inputs
    }),
    signal: AbortSignal.timeout(providerConfig.timeoutMs)
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const providerDiagnostics = diagnostics({
      stage: "run_request",
      modelName: payload.modelName,
      stepIndex: payload.stepIndex,
      httpStatus: response.status,
      safeReason: safeReasonFromStatus(response.status, bodyText),
      providerReturnedJobId: false,
      modelImage: payload.modelImage,
      productImage: payload.productImage
    });
    logFashnDiagnostic("run_rejected", providerDiagnostics);
    return { ...unavailableWithDiagnostics("Virtual Try-On could not be completed right now.", providerDiagnostics), status: "failed" as const };
  }
  const data = await response.json() as FashnRunResponse;
  if (!data.id) {
    const providerDiagnostics = diagnostics({
      stage: "run_response",
      modelName: payload.modelName,
      stepIndex: payload.stepIndex,
      httpStatus: response.status,
      safeReason: safeReasonFromProviderPayload(data),
      providerReturnedJobId: false,
      modelImage: payload.modelImage,
      productImage: payload.productImage
    });
    logFashnDiagnostic("run_missing_job_id", providerDiagnostics);
    return { ...unavailableWithDiagnostics(errorMessage(data.error) || "Virtual Try-On could not be started.", providerDiagnostics), status: "failed" as const };
  }
  logFashnDiagnostic("run_accepted", diagnostics({
    stage: "run_response",
    modelName: payload.modelName,
    stepIndex: payload.stepIndex,
    httpStatus: response.status,
    safeReason: "accepted",
    providerReturnedJobId: true,
    modelImage: payload.modelImage,
    productImage: payload.productImage
  }));
  return pollUntilReady(data.id, {
    ...input,
    cacheKey: `${input.cacheKey || "fashn"}-step-${payload.stepIndex}`
  }, payload.modelName);
}

async function status(jobId: string, input?: TryOnPreviewInput, modelName = config().modelName): Promise<TryOnProviderOutput> {
  const providerConfig = config();
  if (!providerConfig.apiKey) return unavailable("Virtual Try-On is temporarily unavailable.");
  const response = await fetch(`${providerConfig.statusEndpoint.replace(/\/$/, "")}/${encodeURIComponent(jobId)}`, {
    headers: {
      authorization: `Bearer ${providerConfig.apiKey}`
    },
    signal: AbortSignal.timeout(providerConfig.timeoutMs)
  });
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    const bodyText = await response.text().catch(() => "");
    const providerDiagnostics = diagnostics({
      stage: "status_request",
      modelName,
      httpStatus: response.status,
      safeReason: safeReasonFromStatus(response.status, bodyText),
      providerReturnedJobId: Boolean(jobId)
    });
    logFashnDiagnostic("status_rejected", providerDiagnostics);
    return { ...unavailableWithDiagnostics("Virtual Try-On is still preparing.", providerDiagnostics), status: retryable ? "processing" : "failed", jobId };
  }
  const data = await response.json() as FashnStatusResponse;
  const normalized = normalizeStatus(data.status);
  const warnings = errorMessage(data.error) ? [errorMessage(data.error)] : [];
  const providerDiagnostics = diagnostics({
    stage: "status_response",
    modelName,
    httpStatus: response.status,
    safeReason: normalized === "failed" ? safeReasonFromProviderPayload(data) : "accepted",
    providerReturnedJobId: Boolean(data.id || jobId),
    outputCount: data.output?.length || 0,
    providerStatus: data.status,
    providerJobId: data.id || jobId
  });
  if (normalized === "failed") logFashnDiagnostic("status_failed", providerDiagnostics);
  const persisted = normalized === "ready"
    ? await outputToPersistedImages(input || { userId: "", wardrobeItemIds: [] }, data.output || [])
    : { urls: [], storageKeys: [] };
  return {
    status: normalized,
    provider: "fashn",
    previewUrls: persisted.urls,
    previewStorageKeys: persisted.storageKeys,
    animationUrl: null,
    modelUrl: null,
    accuracyLevel: getPreviewAccuracyLevel("garment_referenced"),
    warnings,
    jobId: data.id || jobId,
    providerDiagnostics,
    providerIntermediateImage: normalized === "ready"
      ? (data.output || []).find((value) => Boolean(value && isProviderImage(value)))
      : undefined
  };
}

async function runFashnTryOnStepWithRetry(
  input: TryOnPreviewInput,
  payload: Parameters<typeof runFashnTryOnStep>[1],
  durableModelImage?: string
) {
  let result = await runFashnTryOnStep(input, payload);
  const safeReason = String(result.providerDiagnostics?.safeReason || "");
  if (result.status !== "failed") return result;

  const retryModelImage = durableModelImage && durableModelImage !== payload.modelImage
    ? durableModelImage
    : payload.modelImage;
  if (safeReason === "invalid_or_unreachable_image") {
    logTryOnMetric({
      metric: "provider_step_retry",
      stage: CORE_ROLES.has(payload.role) ? "core" : "finisher",
      status: "retry",
      attempt: 1,
      errorCode: safeReason,
      metadata: { stepIndex: payload.stepIndex, role: payload.role, modelName: payload.modelName }
    });
    await wait(1200);
    if (retryModelImage !== payload.modelImage) await preflightImage(retryModelImage, "model");
    result = await runFashnTryOnStep(input, { ...payload, modelImage: retryModelImage });
    result.providerDiagnostics = {
      ...(result.providerDiagnostics || {}),
      retryCount: 1,
      retryInput: retryModelImage === payload.modelImage ? "same_input" : "durable_intermediate"
    };
  }
  return result;
}

async function pollUntilReady(jobId: string, input: TryOnPreviewInput, modelName: string): Promise<TryOnProviderOutput> {
  const providerConfig = config();
  const deadline = Date.now() + providerConfig.timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      const result = await status(jobId, input, modelName);
      if (result.status === "ready" || result.status === "failed") return result;
    } catch {
      // Retry transient polling transport failures until the overall deadline.
    }
    await wait(backoffDelay(providerConfig.pollMs, attempt));
    attempt += 1;
  }
  return {
    status: "processing",
    provider: "fashn",
    previewUrls: [],
    animationUrl: null,
    modelUrl: null,
    accuracyLevel: getPreviewAccuracyLevel("garment_referenced"),
    warnings: ["Virtual Try-On is still processing."],
    jobId,
    providerDiagnostics: diagnostics({
      stage: "poll_timeout",
      modelName,
      safeReason: "provider_timeout",
      providerReturnedJobId: Boolean(jobId)
    })
  };
}

export function createFashnTryOnProvider(): TryOnProvider {
  return {
    type: "fashn",
    async generateTryOnPreview(input: TryOnPreviewInput) {
      const providerConfig = config();
      if (!providerConfig.apiKey) {
        const providerDiagnostics = diagnostics({
          stage: "configuration",
          modelName: providerConfig.modelName,
          safeReason: "missing_api_key",
          providerReturnedJobId: false
        });
        logFashnDiagnostic("configuration_missing", providerDiagnostics);
        return unavailableWithDiagnostics("Virtual Try-On is temporarily unavailable.", providerDiagnostics);
      }

      const loaded = input.outfitRecommendationId
        ? await loadOwnedAvatarPreviewSubject(input.userId, input.outfitRecommendationId)
        : null;
      const avatarProfile = input.avatarProfileId
        ? await AvatarProfile.findOne({ _id: input.avatarProfileId, userId: input.userId }).lean()
        : null;
      if (!loaded || !avatarProfile) return { ...unavailableWithDiagnostics("Virtual Try-On needs a saved outfit and My Model.", diagnostics({ stage: "input_validation", modelName: providerConfig.modelName, safeReason: "missing_outfit_or_avatar_profile", providerReturnedJobId: false })), status: "failed" };

      const modelImage = await preferredTryOnModelImageUrl(avatarProfile);
      if (!modelImage) return { ...unavailableWithDiagnostics("Choose your My Model before using Virtual Try-On.", diagnostics({ stage: "input_validation", modelName: providerConfig.modelName, safeReason: "missing_model_image", providerReturnedJobId: false })), status: "failed" };

      const preparation = prepareTryOnItems({
        provider: "fashn",
        items: loaded.items,
        referenceItemIds: loaded.referenceItemIds,
        maximumItems: providerConfig.maxOutfitItems,
        maximumFinishers: 0
      });
      const products = rankedProductImages(preparation.sentItems).slice(0, providerConfig.maxOutfitItems);
      const coreProducts = products.filter((product) => CORE_ROLES.has(product.role));
      const finishingProducts = products.filter((product) => !CORE_ROLES.has(product.role));
      const orderedProducts = [...coreProducts, ...finishingProducts];
      const integrityItems: TryOnIntegrityItem[] = orderedProducts.map((product) => ({
        id: product.id,
        name: String(product.item?.name || product.item?.subcategory || product.item?.category || "wardrobe item"),
        category: String(product.item?.category || "unknown"),
        color: String(product.item?.primaryColor?.value || product.item?.color || product.item?.primaryColor || "unknown"),
        role: product.role,
        referenceImageUrl: product.validationUrl
      }));
      const referenceIds = new Set(loaded.referenceItemIds.map(String));
      const subjectItemIds = new Set(loaded.items.map((item: any) => String(item?._id || item?.id || "")).filter(Boolean));
      const providerProductIds = new Set(products.map((product) => String(product.item?._id || product.item?.id || "")).filter(Boolean));
      const eligibleReferenceIds = preparation.sentItemIds.filter((id) => referenceIds.has(String(id)));
      const missingEligibleReferenceCount = eligibleReferenceIds.filter((id) => !providerProductIds.has(String(id))).length;
      console.info("fitpick.tryon.reference_grounding", {
        outfitId: input.outfitRecommendationId || "",
        referenceAnchorCount: referenceIds.size,
        referenceAnchorPresentInSubject: Array.from(referenceIds).every((id) => subjectItemIds.has(id)),
        eligibleReferenceAnchorCount: eligibleReferenceIds.length,
        providerReferenceAnchorCount: Array.from(providerProductIds).filter((id) => referenceIds.has(id)).length,
        missingEligibleReferenceCount,
        timestamp: new Date().toISOString()
      });
      if (missingEligibleReferenceCount) {
        return {
          ...unavailableWithDiagnostics("Virtual Try-On needs a usable image for the uploaded item.", diagnostics({
            stage: "input_validation",
            modelName: providerConfig.modelName,
            safeReason: "missing_reference_product_image",
            providerReturnedJobId: false,
            modelImage
          })),
          status: "failed"
        };
      }
      if (!products.length) return { ...unavailableWithDiagnostics("Virtual Try-On needs at least one closet item with a usable image.", diagnostics({ stage: "input_validation", modelName: providerConfig.modelName, safeReason: "missing_product_image", providerReturnedJobId: false, modelImage })), status: "failed" };

      const [modelImageReady, productImageReadiness] = await Promise.all([
        preflightImage(modelImage, "model"),
        Promise.all(products.map((product) => preflightImage(product.url, "product")))
      ]);
      const firstUnavailableProduct = productImageReadiness.findIndex((ready) => !ready);
      if (!modelImageReady || firstUnavailableProduct >= 0) {
        const unavailableProduct = firstUnavailableProduct >= 0 ? products[firstUnavailableProduct] : null;
        return {
          ...unavailableWithDiagnostics("Virtual Try-On needs accessible images before it can begin.", diagnostics({
            stage: "input_preflight",
            modelName: providerConfig.modelName,
            safeReason: modelImageReady ? "unreachable_product_image" : "unreachable_model_image",
            providerReturnedJobId: false,
            modelImage,
            productImage: unavailableProduct?.url,
            stepIndex: firstUnavailableProduct >= 0 ? firstUnavailableProduct + 1 : undefined
          })),
          status: "failed"
        };
      }

      console.info("fitpick.tryon.preparation", {
        selectedItemCount: loaded.items.length,
        scheduledItemCount: orderedProducts.length,
        coreItemCount: coreProducts.length,
        finishingItemCount: finishingProducts.length,
        recommendationOnlyItemCount: preparation.recommendationOnlyItemIds.length,
        scheduledRoles: orderedProducts.map((product) => product.role),
        timestamp: new Date().toISOString()
      });

      const startedAt = Date.now();
      const warnings = [
        ...(products.length > 1 ? [`MyFitPick applied ${products.length} wardrobe references sequentially for a cleaner preview.`] : []),
        ...(preparation.recommendationOnlyItemIds.length
          ? ["Your complete look includes every selected piece. Small accessories may not appear in the generated preview."]
          : [])
      ];

      try {
        let currentModelImage = modelImage;
        let result: TryOnProviderOutput | null = null;
        let lastReadyResult: TryOnProviderOutput | null = null;
        const completedItemIds: string[] = [];
        const failedItemIds: string[] = [];
        const sentItemIds: string[] = [];

        for (let index = 0; index < orderedProducts.length; index += 1) {
          const product = orderedProducts[index];
          const coreStep = CORE_ROLES.has(product.role);
          const stepStage = coreStep ? "core" : "finisher";
          const stepStartedAt = Date.now();
          if (product.id) sentItemIds.push(product.id);
          console.info("fitpick.tryon.stage", {
            event: "step_started",
            stage: stepStage,
            stepIndex: index + 1,
            role: product.role,
            modelName: providerConfig.modelName,
            timestamp: new Date().toISOString()
          });
          result = await runFashnTryOnStepWithRetry(input, {
            productImage: product.url,
            modelImage: currentModelImage,
            stepIndex: index + 1,
            role: product.role,
            modelName: providerConfig.modelName,
            mode: providerConfig.generationMode,
            prompt: [
              "Create a realistic virtual try-on image for MyFitPick.",
              "Strictly preserve the current model identity, facial geometry, skin texture, hair, pose, hands, body proportions, background, and already-applied outfit pieces from the model image.",
              "Apply only the provided product image in this step, without removing existing correctly applied garments.",
              "Do not repaint the face, hands, exposed skin, hair, legs, or background. Do not smooth skin or introduce painterly texture.",
              "Keep the result premium, natural, and suitable for a fashion styling app.",
              `This step applies: ${product.item.name || product.item.category || "wardrobe item"} (${product.item.category || "unknown"}).`,
              `Complete outfit context: ${loaded.items.map((item) => `${item.name || item.category || "item"} (${item.category || "unknown"})`).join(", ")}.`
            ].join(" ")
          }, lastReadyResult?.previewUrls[0]);

          const stepReady = result.status === "ready" && Boolean(result.previewUrls[0] && result.previewStorageKeys?.[0]);
          logTryOnMetric({
            metric: "provider_step",
            stage: stepStage,
            status: stepReady ? "success" : "failed",
            durationMs: Date.now() - stepStartedAt,
            errorCode: stepReady ? "" : String(result.providerDiagnostics?.safeReason || result.status),
            metadata: { stepIndex: index + 1, role: product.role, modelName: providerConfig.modelName }
          });

          if (!stepReady) {
            if (lastReadyResult?.previewUrls[0] && lastReadyResult.previewStorageKeys?.[0]) {
              if (product.id) failedItemIds.push(product.id);
              console.info("fitpick.tryon.stage", {
                event: "step_skipped_after_failure",
                stage: stepStage,
                stepIndex: index + 1,
                role: product.role,
                safeReason: String(result.providerDiagnostics?.safeReason || result.status),
                timestamp: new Date().toISOString()
              });
              result.warnings = [
                ...warnings,
                `${product.item.name || "A selected piece"} could not be rendered, so MyFitPick did not publish an incomplete Try-On.`,
                ...result.warnings
              ].slice(0, 8);
              result.providerSentItemIds = sentItemIds;
              result.providerCompletedItemIds = completedItemIds;
              result.providerFailedItemIds = failedItemIds;
              result.providerSkippedItemIds = orderedProducts.slice(index + 1).map((entry) => entry.id).filter(Boolean);
              result.pendingItemIds = [];
              result.recommendationOnlyItemIds = [];
              result.previewFidelityLevel = "partial";
              result.progressStage = "not_started";
              result.providerDiagnostics = {
                ...(result.providerDiagnostics || {}),
                completePreviewRequired: true,
                completedItemCount: completedItemIds.length,
                failedItemCount: failedItemIds.length,
                skippedItemCount: result.providerSkippedItemIds.length,
                failedRole: product.role,
                failedStepIndex: index + 1
              };
              return result;
            }

            result.warnings = [...warnings, ...result.warnings].slice(0, 8);
            result.requestedRoles = preparation.fidelity.requestedRoles;
            result.providerSupportedRoles = preparation.fidelity.providerSupportedRoles;
            result.partiallySupportedRoles = preparation.fidelity.partiallySupportedRoles;
            result.unsupportedRoles = preparation.fidelity.unsupportedRoles;
            result.previewFidelityLevel = preparation.fidelity.previewFidelityLevel;
            result.providerSentItemIds = completedItemIds;
            result.providerCompletedItemIds = completedItemIds;
            result.pendingItemIds = orderedProducts.slice(index).map((entry) => entry.id).filter(Boolean);
            result.recommendationOnlyItemIds = preparation.recommendationOnlyItemIds;
            result.progressStage = "not_started";
            return result;
          }

          // Chain the provider's direct output into the next step. The persisted
          // S3 URL remains the durable recovery/display copy, but is not used as
          // an immediate provider input because CDN propagation may lag.
          currentModelImage = result.providerIntermediateImage || result.previewUrls[0];
          lastReadyResult = result;
          if (product.id) completedItemIds.push(product.id);

          const completedCore = index === coreProducts.length - 1 && coreProducts.length > 0;
          if (completedCore && finishingProducts.length) {
            const pendingItemIds = finishingProducts.map((entry) => entry.id).filter(Boolean);
            await publishProgress(input, {
              ...result,
              status: "processing",
              warnings: [...warnings, ...result.warnings].slice(0, 8),
              requestedRoles: preparation.fidelity.requestedRoles,
              providerSupportedRoles: preparation.fidelity.providerSupportedRoles,
              partiallySupportedRoles: preparation.fidelity.partiallySupportedRoles,
              unsupportedRoles: preparation.fidelity.unsupportedRoles,
              previewFidelityLevel: "core_only",
              providerSentItemIds: completedItemIds,
              providerCompletedItemIds: completedItemIds,
              pendingItemIds,
              recommendationOnlyItemIds: preparation.recommendationOnlyItemIds,
              progressStage: "finishing"
            });
          }
        }

        let integrity = await validateTryOnVisualIntegrity({
          previewImageUrl: result?.providerIntermediateImage || result?.previewUrls[0] || "",
          items: integrityItems
        });
        console.info("fitpick.tryon.integrity", {
          event: "final_validation",
          status: integrity.valid ? "passed" : "failed",
          selectedItemCount: integrityItems.length,
          checkedItemCount: integrity.checkedItemIds.length,
          missingItemCount: integrity.missingItemIds.length,
          mismatchedItemCount: integrity.mismatchedItemIds.length,
          unavailable: integrity.unavailable,
          safeReason: integrity.safeReason,
          timestamp: new Date().toISOString()
        });

        let integrityAcceptedWithWarnings = false;
        if (!integrity.valid && !integrity.unavailable) {
          const baselineResult = result;
          const repairIndex = selectSingleIntegrityRepairIndex(orderedProducts, integrity);
          const repairProduct = repairIndex >= 0 ? orderedProducts[repairIndex] : null;
          if (repairProduct) {
            const repairStartedAt = Date.now();
            const repaired = await runFashnTryOnStepWithRetry(input, {
              productImage: repairProduct.url,
              modelImage: currentModelImage,
              stepIndex: repairIndex + 1,
              role: repairProduct.role,
              modelName: providerConfig.modelName,
              mode: providerConfig.generationMode,
              prompt: [
                "Perform one minimal MyFitPick virtual try-on correction.",
                "Preserve the model identity, facial geometry, skin texture, hair, hands, pose, body proportions, background, and every garment already present.",
                "Apply only the supplied missing product. Do not repaint unrelated pixels or replay any other selected item.",
                `Repair item: ${repairProduct.item.name || repairProduct.item.category || "wardrobe item"} (${repairProduct.item.category || "unknown"}).`
              ].join(" ")
            }, baselineResult?.previewUrls[0]);
            const repairReady = repaired.status === "ready" && Boolean(repaired.previewUrls[0] && repaired.previewStorageKeys?.[0]);
            logTryOnMetric({
              metric: "visual_integrity_repair",
              stage: "repair",
              status: repairReady ? "success" : "failed",
              durationMs: Date.now() - repairStartedAt,
              attempt: 1,
              errorCode: repairReady ? "" : String(repaired.providerDiagnostics?.safeReason || repaired.status),
              metadata: { stepIndex: repairIndex + 1, role: repairProduct.role, repairStrategy: "single_item" }
            });
            if (repairReady) {
              const repairedIntegrity = await validateTryOnVisualIntegrity({
                previewImageUrl: repaired.providerIntermediateImage || repaired.previewUrls[0] || "",
                items: integrityItems
              });
              console.info("fitpick.tryon.integrity", {
                event: "repair_validation",
                status: repairedIntegrity.valid ? "passed" : "failed",
                repairRound: 1,
                selectedItemCount: integrityItems.length,
                checkedItemCount: repairedIntegrity.checkedItemIds.length,
                missingItemCount: repairedIntegrity.missingItemIds.length,
                mismatchedItemCount: repairedIntegrity.mismatchedItemIds.length,
                unavailable: repairedIntegrity.unavailable,
                safeReason: repairedIntegrity.safeReason,
                timestamp: new Date().toISOString()
              });
              if (repairedIntegrity.valid) {
                result = repaired;
                currentModelImage = repaired.providerIntermediateImage || repaired.previewUrls[0];
                integrity = repairedIntegrity;
              }
            }
          }
          if (!integrity.valid && integrity.safeReason === "visual_integrity_failed" && baselineResult) {
            result = baselineResult;
            integrityAcceptedWithWarnings = true;
          }
        }

        if (integrity.unavailable && result) {
          result.status = "processing";
          result.warnings = [
            ...warnings,
            "Your preview was generated and is awaiting a final visual check."
          ].slice(0, 8);
          result.requestedRoles = preparation.fidelity.requestedRoles;
          result.providerSupportedRoles = preparation.fidelity.providerSupportedRoles;
          result.partiallySupportedRoles = preparation.fidelity.partiallySupportedRoles;
          result.unsupportedRoles = preparation.fidelity.unsupportedRoles;
          result.providerSentItemIds = sentItemIds;
          result.providerCompletedItemIds = completedItemIds;
          result.providerFailedItemIds = failedItemIds;
          result.providerSkippedItemIds = [];
          result.pendingItemIds = [];
          result.recommendationOnlyItemIds = [];
          result.previewFidelityLevel = "full";
          result.progressStage = "complete";
          result.visualIntegrityPending = true;
          result.visualIntegritySafeReason = integrity.safeReason;
          result.visualIntegrityCheckedItemIds = integrity.checkedItemIds;
          result.visualIntegrityMissingItemIds = integrity.missingItemIds;
          result.visualIntegrityMismatchedItemIds = integrity.mismatchedItemIds;
          result.providerDiagnostics = {
            ...(result.providerDiagnostics || {}),
            visualIntegrityPending: true,
            visualIntegrityValidated: false,
            visualIntegritySafeReason: integrity.safeReason,
            sentItemCount: sentItemIds.length,
            completedItemCount: completedItemIds.length
          };
          return result;
        }

        if (!integrity.valid && !integrityAcceptedWithWarnings) {
          return {
            ...unavailableWithDiagnostics("Virtual Try-On could not verify every selected piece. Try again.", diagnostics({
              stage: "visual_integrity",
              modelName: providerConfig.modelName,
              safeReason: integrity.safeReason || "visual_integrity_failed",
              providerReturnedJobId: Boolean(result?.jobId),
              providerJobId: result?.jobId || undefined
            })),
            status: "failed",
            providerCompletedItemIds: integrity.checkedItemIds,
            providerFailedItemIds: Array.from(new Set([...integrity.missingItemIds, ...integrity.mismatchedItemIds])),
            providerSkippedItemIds: [],
            pendingItemIds: [],
            recommendationOnlyItemIds: [],
            progressStage: "not_started",
            previewFidelityLevel: "partial",
            providerDiagnostics: {
              ...diagnostics({
                stage: "visual_integrity",
                modelName: providerConfig.modelName,
                safeReason: integrity.safeReason || "visual_integrity_failed",
                providerReturnedJobId: Boolean(result?.jobId),
                providerJobId: result?.jobId || undefined
              }),
              completePreviewRequired: true,
              visualIntegrityValidated: false,
              checkedItemCount: integrity.checkedItemIds.length,
              missingItemCount: integrity.missingItemIds.length,
              mismatchedItemCount: integrity.mismatchedItemIds.length
            }
          };
        }

        if (!result) return { ...unavailable("Virtual Try-On could not process the selected outfit."), status: "failed" };
        result.warnings = [
          ...warnings,
          ...(integrityAcceptedWithWarnings ? ["Some layered or finishing pieces may be less visible in this preview."] : []),
          ...result.warnings
        ].slice(0, 8);
        result.requestedRoles = preparation.fidelity.requestedRoles;
        result.providerSupportedRoles = preparation.fidelity.providerSupportedRoles;
        result.partiallySupportedRoles = preparation.fidelity.partiallySupportedRoles;
        result.unsupportedRoles = preparation.fidelity.unsupportedRoles;
        result.previewFidelityLevel = preparation.fidelity.previewFidelityLevel;
        result.providerSentItemIds = sentItemIds;
        result.providerCompletedItemIds = completedItemIds;
        result.providerFailedItemIds = failedItemIds;
        result.providerSkippedItemIds = [];
        result.pendingItemIds = [];
        result.recommendationOnlyItemIds = preparation.recommendationOnlyItemIds;
        result.previewFidelityLevel = integrityAcceptedWithWarnings || preparation.recommendationOnlyItemIds.length ? "partial" : "full";
        result.progressStage = "complete";
        result.providerDiagnostics = {
          ...(result.providerDiagnostics || {}),
          sentItemCount: sentItemIds.length,
          completedItemCount: completedItemIds.length,
          failedItemCount: failedItemIds.length,
          recommendationOnlyItemCount: result.recommendationOnlyItemIds.length,
          visualIntegrityValidated: integrity.valid,
          visualIntegrityAcceptedWithWarnings: integrityAcceptedWithWarnings,
          previewFidelityLevel: result.previewFidelityLevel,
          progressStage: result.progressStage
        };

        logAiEvent({
          operation: "fashn-tryon-run",
          model: providerConfig.modelName,
          latencyMs: Date.now() - startedAt,
          status: result.status === "failed" ? "failed" : "success",
          cacheHit: false,
          provider: "fashn"
        });
        return result;
      } catch (error) {
        logAiEvent({
          operation: "fashn-tryon-run",
          model: providerConfig.modelName,
          latencyMs: Date.now() - startedAt,
          status: "failed",
          cacheHit: false,
          provider: "fashn",
          errorCategory: errorCategory(error)
        });
        return { ...unavailable("Virtual Try-On could not be completed right now."), status: "failed" };
      }
    },
    async generateGarmentMesh(input: TryOnPreviewInput) {
      return this.generateTryOnPreview(input);
    },
    async generateAnimatedAvatarTryOn(input: TryOnPreviewInput) {
      return this.generateTryOnPreview({ ...input, desiredView: input.desiredView || "360" });
    },
    async getTryOnJobStatus(jobId: string) {
      return status(jobId);
    }
  };
}
