import { preferredTryOnModelImageUrl } from "@/lib/avatar/avatar-profile";
import { errorCategory, logAiEvent } from "@/lib/ai/observability/ai-logger";
import { loadOwnedAvatarPreviewSubject } from "@/lib/avatar/avatar-preview";
import { getPreviewAccuracyLevel } from "@/lib/preview/preview-accuracy";
import { preferredVisualReferenceUrl } from "@/lib/preview/visual-grounding";
import { uploadGeneratedImage } from "@/lib/storage/generated-images";
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

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "FASHN try-on failed.";
}

function selectProductImage(items: any[]) {
  const ranked = [...items].sort((a, b) => {
    const aCategory = `${a.category || ""} ${a.subcategory || ""}`.toLowerCase();
    const bCategory = `${b.category || ""} ${b.subcategory || ""}`.toLowerCase();
    const aScore = fashionCategories.findIndex((category) => aCategory.includes(category));
    const bScore = fashionCategories.findIndex((category) => bCategory.includes(category));
    return (aScore === -1 ? 999 : aScore) - (bScore === -1 ? 999 : bScore);
  });
  return ranked.map((item) => ({ item, url: preferredVisualReferenceUrl(item) })).find((entry) => entry.url);
}

async function outputToUrls(input: TryOnPreviewInput, output: string[] = []) {
  const urls: string[] = [];
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
      continue;
    }
    urls.push(value);
  }
  return urls;
}

async function status(jobId: string, input?: TryOnPreviewInput): Promise<TryOnProviderOutput> {
  const providerConfig = config();
  if (!providerConfig.apiKey) return unavailable("FASHN_API_KEY is not configured.");
  const response = await fetch(`${providerConfig.statusEndpoint.replace(/\/$/, "")}/${encodeURIComponent(jobId)}`, {
    headers: {
      authorization: `Bearer ${providerConfig.apiKey}`
    },
    signal: AbortSignal.timeout(providerConfig.timeoutMs)
  });
  if (!response.ok) return { ...unavailable(`FASHN status returned HTTP ${response.status}.`), status: "failed" };
  const data = await response.json() as FashnStatusResponse;
  const normalized = normalizeStatus(data.status);
  const warnings = errorMessage(data.error) ? [errorMessage(data.error)] : [];
  return {
    status: normalized,
    provider: "fashn",
    previewUrls: normalized === "ready" ? await outputToUrls(input || { userId: "", wardrobeItemIds: [] }, data.output || []) : [],
    animationUrl: null,
    modelUrl: null,
    accuracyLevel: getPreviewAccuracyLevel("garment_referenced"),
    warnings,
    jobId: data.id || jobId
  };
}

async function pollUntilReady(jobId: string, input: TryOnPreviewInput): Promise<TryOnProviderOutput> {
  const providerConfig = config();
  const deadline = Date.now() + providerConfig.timeoutMs;
  while (Date.now() < deadline) {
    const result = await status(jobId, input);
    if (result.status === "ready" || result.status === "failed") return result;
    await wait(providerConfig.pollMs);
  }
  return {
    status: "processing",
    provider: "fashn",
    previewUrls: [],
    animationUrl: null,
    modelUrl: null,
    accuracyLevel: getPreviewAccuracyLevel("garment_referenced"),
    warnings: ["FASHN try-on is still processing."],
    jobId
  };
}

export function createFashnTryOnProvider(): TryOnProvider {
  return {
    type: "fashn",
    async generateTryOnPreview(input: TryOnPreviewInput) {
      const providerConfig = config();
      if (!providerConfig.apiKey) return unavailable("FASHN_API_KEY is not configured.");

      const loaded = input.outfitRecommendationId
        ? await loadOwnedAvatarPreviewSubject(input.userId, input.outfitRecommendationId)
        : null;
      const avatarProfile = input.avatarProfileId
        ? await AvatarProfile.findOne({ _id: input.avatarProfileId, userId: input.userId }).lean()
        : null;
      if (!loaded || !avatarProfile) return { ...unavailable("FASHN try-on needs an outfit recommendation and avatar profile."), status: "failed" };

      const modelImage = preferredTryOnModelImageUrl(avatarProfile);
      if (!modelImage) return { ...unavailable("Add an uploaded full-body model photo or generate a FitPick model image before using FASHN."), status: "failed" };

      const product = selectProductImage(loaded.items);
      if (!product?.url) return { ...unavailable("FASHN needs at least one wardrobe item with a usable reference image."), status: "failed" };

      const startedAt = Date.now();
      const warnings = loaded.items.length > 1
        ? ["FASHN Try-On Max accepts one product image per request; FitPick sent the strongest available garment reference and included the full outfit context in the prompt."]
        : [];

      try {
        const response = await fetch(providerConfig.runEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${providerConfig.apiKey}`
          },
          body: JSON.stringify({
            model_name: providerConfig.modelName,
            inputs: {
              product_image: product.url,
              model_image: modelImage,
              prompt: [
                "Create a realistic virtual try-on image for FitPick.",
                "Preserve the model identity, pose, and body proportions from the model image.",
                "Place the product image accurately on the model.",
                "Keep the result premium, natural, and suitable for a fashion styling app.",
                `Selected outfit context: ${loaded.items.map((item) => `${item.name || item.category || "item"} (${item.category || "unknown"})`).join(", ")}.`
              ].join(" "),
              resolution: providerConfig.resolution,
              generation_mode: providerConfig.generationMode,
              output_format: providerConfig.outputFormat,
              return_base64: providerConfig.returnBase64
            }
          }),
          signal: AbortSignal.timeout(providerConfig.timeoutMs)
        });

        if (!response.ok) {
          logAiEvent({
            operation: "fashn-tryon-run",
            model: providerConfig.modelName,
            latencyMs: Date.now() - startedAt,
            status: "failed",
            cacheHit: false,
            provider: "fashn",
            errorCategory: `http_${response.status}`
          });
          return { ...unavailable(`FASHN run returned HTTP ${response.status}.`), status: "failed" };
        }

        const data = await response.json() as FashnRunResponse;
        if (!data.id) return { ...unavailable(errorMessage(data.error) || data.message || "FASHN did not return a prediction ID."), status: "failed" };
        const result = await pollUntilReady(data.id, input);
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
        return { ...unavailable("FASHN try-on request failed."), status: "failed" };
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
