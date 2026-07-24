import { preferredTryOnModelImageUrl, serializeAvatarProfile } from "@/lib/avatar/avatar-profile";
import { errorCategory, logAiEvent } from "@/lib/ai/observability/ai-logger";
import { loadOwnedAvatarPreviewSubject } from "@/lib/avatar/avatar-preview";
import { getPreviewAccuracyLevel } from "@/lib/preview/preview-accuracy";
import { preferredVisualReferenceUrl } from "@/lib/preview/visual-grounding";
import { uploadGeneratedImage, uploadGeneratedImageFromUrl } from "@/lib/storage/generated-images";
import type { TryOnProvider, TryOnPreviewInput, TryOnProviderOutput } from "@/lib/tryon/types";
import { AvatarProfile } from "@/models/AvatarProfile";

type CustomTryOnResponse = {
  status?: string;
  previewUrl?: string;
  imageUrl?: string;
  previewUrls?: string[];
  images?: Array<{ url?: string }>;
  previewBase64?: string;
  base64?: string;
  contentType?: string;
  width?: number;
  height?: number;
  animationUrl?: string | null;
  modelUrl?: string | null;
  jobId?: string | null;
  warnings?: string[];
  accuracyLevel?: TryOnPreviewInput["accuracyLevelRequested"];
};

function unavailable(message = "Virtual Try-On is temporarily unavailable."): TryOnProviderOutput {
  return {
    status: "provider_unavailable",
    provider: "custom",
    previewUrls: [],
    animationUrl: null,
    modelUrl: null,
    accuracyLevel: getPreviewAccuracyLevel("garment_referenced"),
    warnings: [message]
  };
}

function config() {
  return {
    endpoint: process.env.TRYON_CUSTOM_ENDPOINT || process.env.TRYON_API_URL || "",
    statusEndpoint: process.env.TRYON_CUSTOM_STATUS_ENDPOINT || process.env.TRYON_STATUS_URL || "",
    apiKey: process.env.TRYON_CUSTOM_API_KEY || process.env.TRYON_API_KEY || "",
    timeoutMs: Math.max(5000, Math.min(Number(process.env.TRYON_TIMEOUT_MS || 90000), 180000))
  };
}

function normalizeStatus(value?: string, hasPersistedOutput = false): TryOnProviderOutput["status"] {
  if (!value) return hasPersistedOutput ? "ready" : "processing";
  if (value === "ready" || value === "completed" || value === "succeeded" || value === "success") return "ready";
  if (value === "queued" || value === "pending") return "queued";
  if (value === "processing" || value === "running" || value === "generating") return "processing";
  if (value === "failed" || value === "error" || value === "cancelled") return "failed";
  return "processing";
}

function previewUrlsFromResponse(data: CustomTryOnResponse) {
  return [
    data.previewUrl,
    data.imageUrl,
    ...(Array.isArray(data.previewUrls) ? data.previewUrls : []),
    ...(Array.isArray(data.images) ? data.images.map((image) => image?.url) : [])
  ].map((url) => String(url || "").trim()).filter(Boolean);
}

function contentFormat(contentType = "image/png") {
  if (/webp/i.test(contentType)) return "webp" as const;
  if (/jpe?g/i.test(contentType)) return "jpeg" as const;
  return "png" as const;
}

function garmentPayload(item: any) {
  const referenceImageUrl = preferredVisualReferenceUrl(item);
  return {
    id: String(item._id || item.id || ""),
    name: item.name || "",
    category: item.category || "",
    subcategory: item.subcategory || "",
    color: item.color || "",
    pattern: item.pattern || "",
    fabric: item.fabric || "",
    fit: item.fit || "",
    taggedSize: item.taggedSize || "",
    sizeSystem: item.sizeSystem || "",
    garmentFit: item.garmentFit || "",
    stretchLevel: item.stretchLevel || "",
    fabricDrape: item.fabricDrape || "",
    measurements: item.garmentMeasurements || {},
    imageUrl: item.imageUrl || "",
    thumbnailUrl: item.thumbnailUrl || "",
    referenceImageUrl,
    images: item.images || {}
  };
}

function safeProviderWarnings(warnings?: string[]) {
  if (!Array.isArray(warnings) || !warnings.length) return [];
  return ["Virtual Try-On preview is estimated."];
}

async function toProviderOutput(input: TryOnPreviewInput, data: CustomTryOnResponse): Promise<TryOnProviderOutput> {
  const urls = previewUrlsFromResponse(data);
  const base64 = data.previewBase64 || data.base64 || "";
  let uploadedUrl = "";
  const storageKeys: string[] = [];

  if (base64 && input.outfitRecommendationId) {
    const uploaded = await uploadGeneratedImage(base64, {
      userId: input.userId,
      outfitId: input.outfitRecommendationId,
      cacheKey: input.cacheKey || data.jobId || `custom-${Date.now()}`,
      contentType: data.contentType || "image/png",
      format: contentFormat(data.contentType),
      width: data.width || 1024,
      height: data.height || 1024
    });
    uploadedUrl = uploaded.url;
    storageKeys.push(uploaded.storageKey);
  }

  const persistedUrls: string[] = [];
  if (input.outfitRecommendationId) {
    for (const url of urls) {
      if (!/^https:\/\//i.test(url)) continue;
      const uploaded = await uploadGeneratedImageFromUrl(url, {
        userId: input.userId,
        outfitId: input.outfitRecommendationId,
        cacheKey: input.cacheKey || data.jobId || `custom-${Date.now()}`,
        width: data.width || 1024,
        height: data.height || 1024
      });
      persistedUrls.push(uploaded.url);
      storageKeys.push(uploaded.storageKey);
    }
  }

  const status = normalizeStatus(data.status, Boolean(uploadedUrl || persistedUrls.length));
  return {
    status: status === "ready" && !persistedUrls.length && !uploadedUrl && data.jobId ? "processing" : status,
    provider: "custom",
    previewUrls: uploadedUrl ? [uploadedUrl, ...persistedUrls] : persistedUrls,
    previewStorageKeys: storageKeys,
    animationUrl: data.animationUrl || null,
    modelUrl: data.modelUrl || null,
    accuracyLevel: getPreviewAccuracyLevel(data.accuracyLevel || input.accuracyLevelRequested || "true_3d_simulation"),
    warnings: safeProviderWarnings(data.warnings),
    jobId: data.jobId || null
  };
}

async function callEndpoint(input: TryOnPreviewInput, payload: Record<string, unknown>): Promise<TryOnProviderOutput> {
  const providerConfig = config();
  if (!providerConfig.endpoint) return unavailable("Virtual Try-On is temporarily unavailable.");

  const startedAt = Date.now();
  try {
    const response = await fetch(providerConfig.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(providerConfig.apiKey ? { authorization: `Bearer ${providerConfig.apiKey}` } : {})
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(providerConfig.timeoutMs)
    });

    if (!response.ok) {
      logAiEvent({
        operation: "virtual-tryon-provider",
        model: "custom-vton",
        latencyMs: Date.now() - startedAt,
        status: "failed",
        cacheHit: false,
        provider: "custom",
        errorCategory: `http_${response.status}`
      });
      return { ...unavailable("Virtual Try-On could not be completed right now."), status: "failed" };
    }

    const output = await toProviderOutput(input, await response.json() as CustomTryOnResponse);
    logAiEvent({
      operation: "virtual-tryon-provider",
      model: "custom-vton",
      latencyMs: Date.now() - startedAt,
      status: output.status === "failed" ? "failed" : "success",
      cacheHit: false,
      provider: "custom"
    });
    return output;
  } catch (error) {
    logAiEvent({
      operation: "virtual-tryon-provider",
      model: "custom-vton",
      latencyMs: Date.now() - startedAt,
      status: "failed",
      cacheHit: false,
      provider: "custom",
      errorCategory: errorCategory(error)
    });
    return { ...unavailable("Virtual Try-On could not be completed right now."), status: "failed" };
  }
}

async function status(jobId: string): Promise<TryOnProviderOutput> {
  const providerConfig = config();
  if (!providerConfig.statusEndpoint) return unavailable("Virtual Try-On is temporarily unavailable.");
  const url = providerConfig.statusEndpoint.includes("{jobId}")
    ? providerConfig.statusEndpoint.replace("{jobId}", encodeURIComponent(jobId))
    : `${providerConfig.statusEndpoint.replace(/\/$/, "")}/${encodeURIComponent(jobId)}`;
  const response = await fetch(url, {
    headers: {
      ...(providerConfig.apiKey ? { authorization: `Bearer ${providerConfig.apiKey}` } : {})
    },
    signal: AbortSignal.timeout(providerConfig.timeoutMs)
  });
  if (!response.ok) return { ...unavailable("Virtual Try-On is still preparing."), status: "failed" };
  return toProviderOutput({ userId: "", wardrobeItemIds: [] }, await response.json() as CustomTryOnResponse);
}

export function createDedicatedVtonTryOnProvider(): TryOnProvider {
  return {
    type: "custom",
    async generateTryOnPreview(input: TryOnPreviewInput) {
      const loaded = input.outfitRecommendationId
        ? await loadOwnedAvatarPreviewSubject(input.userId, input.outfitRecommendationId)
        : null;
      const avatarProfile = input.avatarProfileId
        ? await AvatarProfile.findOne({ _id: input.avatarProfileId, userId: input.userId }).lean()
        : null;
      if (!loaded || !avatarProfile) {
        return { ...unavailable("Virtual Try-On needs a saved outfit and full-body photo."), status: "failed" };
      }
      const modelImageUrl = preferredTryOnModelImageUrl(avatarProfile);
      if (!modelImageUrl) return { ...unavailable("Upload a full-body photo before using Virtual Try-On."), status: "failed" };

      return callEndpoint(input, {
        requestType: "virtual_try_on",
        userId: input.userId,
        outfitRecommendationId: input.outfitRecommendationId,
        wardrobeItemIds: input.wardrobeItemIds,
        desiredView: input.desiredView || "front",
        accuracyLevelRequested: input.accuracyLevelRequested || "true_3d_simulation",
        cacheKey: input.cacheKey,
        avatar: serializeAvatarProfile(avatarProfile),
        modelImageUrl,
        avatarMeasurements: input.avatarMeasurements || {},
        garments: loaded.items.map(garmentPayload),
        garmentAssets: input.garmentAssets || [],
        garmentMeasurements: input.garmentMeasurements || [],
        fitLockConstraints: input.fitLockConstraints || null,
        instructions: [
          "Generate a photorealistic digital human/model wearing the selected garments.",
          "Use garment image references as the source of truth.",
          "Preserve exact category, color, silhouette, fabric, shoes, bags, and accessories.",
          "Do not invent replacement items."
        ]
      });
    },
    async generateGarmentMesh(input: TryOnPreviewInput) {
      return this.generateTryOnPreview({ ...input, accuracyLevelRequested: "true_3d_simulation" });
    },
    async generateAnimatedAvatarTryOn(input: TryOnPreviewInput) {
      return this.generateTryOnPreview({ ...input, desiredView: input.desiredView || "360", accuracyLevelRequested: "true_3d_simulation" });
    },
    async getTryOnJobStatus(jobId: string) {
      return status(jobId);
    }
  };
}
