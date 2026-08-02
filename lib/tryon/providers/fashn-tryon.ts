import { preferredTryOnModelImageUrl } from "@/lib/avatar/avatar-profile";
import { errorCategory, logAiEvent } from "@/lib/ai/observability/ai-logger";
import { loadOwnedAvatarPreviewSubject } from "@/lib/avatar/avatar-preview";
import { getPreviewAccuracyLevel } from "@/lib/preview/preview-accuracy";
import { preferredVisualReferenceUrl } from "@/lib/preview/visual-grounding";
import { uploadGeneratedImage, uploadGeneratedImageFromUrl } from "@/lib/storage/generated-images";
import type { TryOnProvider, TryOnPreviewInput, TryOnProviderOutput } from "@/lib/tryon/types";
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
};

const fashionCategories = ["top", "shirt", "blouse", "jacket", "coat", "dress", "bottom", "trouser", "pant", "jean", "skirt", "shoe", "bag", "accessory"];

function config() {
  const baseUrl = (process.env.FASHN_BASE_URL || "https://api.fashn.ai/v1").replace(/\/$/, "");
  return {
    apiKey: process.env.FASHN_API_KEY || process.env.TRYON_FASHN_API_KEY || "",
    runEndpoint: process.env.FASHN_RUN_ENDPOINT || `${baseUrl}/run`,
    statusEndpoint: process.env.FASHN_STATUS_ENDPOINT || `${baseUrl}/status`,
    modelName: process.env.FASHN_MODEL_NAME || "tryon-max",
    resolution: process.env.FASHN_RESOLUTION || "1k",
    generationMode: process.env.FASHN_GENERATION_MODE || "balanced",
    outputFormat: process.env.FASHN_OUTPUT_FORMAT || "png",
    returnBase64: process.env.FASHN_RETURN_BASE64 !== "false",
    maxOutfitItems: Math.max(1, Math.min(Number(process.env.FASHN_MAX_OUTFIT_ITEMS || 6), 10)),
    timeoutMs: Math.max(15000, Math.min(Number(process.env.FASHN_TIMEOUT_MS || process.env.TRYON_TIMEOUT_MS || 90000), 180000)),
    pollMs: Math.max(1500, Math.min(Number(process.env.FASHN_POLL_MS || 3000), 10000))
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
    providerStatus: input.providerStatus
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
  const ranked = [...items].sort((a, b) => {
    const aCategory = `${a.category || ""} ${a.subcategory || ""}`.toLowerCase();
    const bCategory = `${b.category || ""} ${b.subcategory || ""}`.toLowerCase();
    const aScore = fashionCategories.findIndex((category) => aCategory.includes(category));
    const bScore = fashionCategories.findIndex((category) => bCategory.includes(category));
    return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
  });
  return ranked.map((item) => ({ item, url: preferredVisualReferenceUrl(item) })).filter((entry) => entry.url);
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
}) {
  const providerConfig = config();
  const response = await fetch(providerConfig.runEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${providerConfig.apiKey}`
    },
    body: JSON.stringify({
      model_name: providerConfig.modelName,
      inputs: {
        product_image: payload.productImage,
        model_image: payload.modelImage,
        prompt: payload.prompt,
        resolution: providerConfig.resolution,
        generation_mode: providerConfig.generationMode,
        output_format: providerConfig.outputFormat,
        return_base64: providerConfig.returnBase64
      }
    }),
    signal: AbortSignal.timeout(providerConfig.timeoutMs)
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const providerDiagnostics = diagnostics({
      stage: "run_request",
      modelName: providerConfig.modelName,
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
      modelName: providerConfig.modelName,
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
    modelName: providerConfig.modelName,
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
  });
}

async function status(jobId: string, input?: TryOnPreviewInput): Promise<TryOnProviderOutput> {
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
      modelName: providerConfig.modelName,
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
    modelName: providerConfig.modelName,
    httpStatus: response.status,
    safeReason: normalized === "failed" ? safeReasonFromProviderPayload(data) : "accepted",
    providerReturnedJobId: Boolean(data.id || jobId),
    outputCount: data.output?.length || 0,
    providerStatus: data.status
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
    providerDiagnostics
  };
}

async function pollUntilReady(jobId: string, input: TryOnPreviewInput): Promise<TryOnProviderOutput> {
  const providerConfig = config();
  const deadline = Date.now() + providerConfig.timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      const result = await status(jobId, input);
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
      modelName: providerConfig.modelName,
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

      const products = rankedProductImages(loaded.items).slice(0, providerConfig.maxOutfitItems);
      if (!products.length) return { ...unavailableWithDiagnostics("Virtual Try-On needs at least one closet item with a usable image.", diagnostics({ stage: "input_validation", modelName: providerConfig.modelName, safeReason: "missing_product_image", providerReturnedJobId: false, modelImage })), status: "failed" };

      const startedAt = Date.now();
      const warnings = products.length > 1
        ? [`MyFitPick applied ${products.length} wardrobe references sequentially for a cleaner preview.`]
        : [];

      try {
        let currentModelImage = modelImage;
        let result: TryOnProviderOutput | null = null;

        for (let index = 0; index < products.length; index += 1) {
          const product = products[index];
          result = await runFashnTryOnStep(input, {
            productImage: product.url,
            modelImage: currentModelImage,
            stepIndex: index + 1,
            prompt: [
              "Create a realistic virtual try-on image for MyFitPick.",
              "Preserve the current model identity, face, pose, body proportions, and already-applied outfit pieces from the model image.",
              "Apply only the provided product image in this step, without removing existing correctly applied garments.",
              "Keep the result premium, natural, and suitable for a fashion styling app.",
              `This step applies: ${product.item.name || product.item.category || "wardrobe item"} (${product.item.category || "unknown"}).`,
              `Complete outfit context: ${loaded.items.map((item) => `${item.name || item.category || "item"} (${item.category || "unknown"})`).join(", ")}.`
            ].join(" ")
          });

          if (result.status === "failed" || result.status === "provider_unavailable") return result;
          if (result.status !== "ready" || !result.previewUrls[0]) {
            result.warnings = [...warnings, ...result.warnings].slice(0, 8);
            return result;
          }
          currentModelImage = result.previewUrls[0];
        }

        if (!result) return { ...unavailable("Virtual Try-On could not process the selected outfit."), status: "failed" };
        result.warnings = [...warnings, ...result.warnings].slice(0, 8);

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
