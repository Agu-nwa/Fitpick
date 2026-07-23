import {
  avatarPreviewPromptVersion,
  buildAvatarCacheKeyFromItems,
  loadOwnedAvatarPreviewSubject
} from "@/lib/avatar/avatar-preview";
import { evaluateOutfitFitOnAvatar } from "@/lib/fit/fit-lock";
import { getPreviewAccuracyLevel } from "@/lib/preview/preview-accuracy";
import { summarizeVisualizationRisks } from "@/lib/preview/visual-grounding";
import { assertUsablePreviewRecord } from "@/lib/tryon/tryon-image-validation";
import { createDedicatedVtonTryOnProvider } from "@/lib/tryon/providers/dedicated-vton-tryon";
import { createFashnTryOnProvider } from "@/lib/tryon/providers/fashn-tryon";
import { createOpenAiTryOnProvider } from "@/lib/tryon/providers/openai-tryon";
import type { TryOnProvider, TryOnProviderOutput, TryOnProviderType, TryOnDesiredView } from "@/lib/tryon/types";
import { safeTryOnErrorMessage, safeUserMessages } from "@/lib/user-facing-errors";
import { AvatarOutfitPreview } from "@/models/AvatarOutfitPreview";
import { AvatarProfile } from "@/models/AvatarProfile";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";

export type { TryOnProvider, TryOnProviderOutput, TryOnProviderType, TryOnPreviewInput, TryOnDesiredView } from "@/lib/tryon/types";

function unavailable(provider: TryOnProviderType, message = "True virtual try-on provider is not configured yet."): TryOnProviderOutput {
  return {
    status: "provider_unavailable",
    provider,
    previewUrls: [],
    animationUrl: null,
    modelUrl: null,
    accuracyLevel: getPreviewAccuracyLevel("garment_referenced"),
    warnings: [message]
  };
}

function unavailableProvider(providerType: TryOnProviderType): TryOnProvider {
  return {
    type: providerType,
    async generateTryOnPreview() {
      return unavailable(providerType);
    },
    async generateGarmentMesh() {
      return unavailable(providerType, "Garment mesh generation requires a configured VTON or 3D garment provider.");
    },
    async generateAnimatedAvatarTryOn() {
      return unavailable(providerType, "Animated digital-human try-on requires a configured VTON or 3D garment provider.");
    },
    async getTryOnJobStatus() {
      return unavailable(providerType, "External try-on job status is unavailable until a provider is configured.");
    }
  };
}

export function getConfiguredTryOnProviderType(): TryOnProviderType {
  const configured = (process.env.TRYON_PROVIDER || "internal_preview").trim() as TryOnProviderType;
  if (["internal_preview", "pictofit", "clo_pipeline", "browzwear_pipeline", "fashn", "custom", "none"].includes(configured)) {
    return configured;
  }
  return "internal_preview";
}

export function getTryOnProvider(providerType: TryOnProviderType = getConfiguredTryOnProviderType()): TryOnProvider {
  if (providerType === "internal_preview") return createOpenAiTryOnProvider();
  if (providerType === "fashn") return createFashnTryOnProvider();
  if (providerType === "custom") return createDedicatedVtonTryOnProvider();
  return unavailableProvider(providerType);
}

async function saveProviderPreview(input: {
  userId: string;
  outfitId: string;
  avatarProfileId: string;
  wardrobeItemIds?: string[];
  desiredView?: TryOnDesiredView;
  cacheKey?: string;
}, output: TryOnProviderOutput) {
  const loaded = await loadOwnedAvatarPreviewSubject(input.userId, input.outfitId);
  const avatarProfile = await AvatarProfile.findOne({ _id: input.avatarProfileId, userId: input.userId });
  if (!loaded || !avatarProfile) return null;

  const fitEvaluation = evaluateOutfitFitOnAvatar(avatarProfile, loaded.items);
  const grounding = summarizeVisualizationRisks(loaded.items, {
    outfitDescription: loaded.items.map((item) => `Wardrobe item ID: ${String(item._id)} Category: ${item.category || "unknown"}`).join("\n")
  });
  const imageUrl = output.previewUrls[0] || "";
  const storageKey = output.previewStorageKeys?.[0] || "";
  const outputWarnings = safeUserMessages(output.warnings);
  const failureMessage = safeTryOnErrorMessage(output.warnings[0]);
  const cacheKey = input.cacheKey || buildAvatarCacheKeyFromItems(input.userId, input.outfitId, loaded.items, avatarProfile, {
    posePreset: input.desiredView === "walking" ? "walking" : input.desiredView === "side" ? "side" : input.desiredView === "back" ? "back" : avatarProfile.posePreset,
    visualizationStyle: avatarProfile.visualizationStyle
  });
  const ready = output.status === "ready" && Boolean(imageUrl) && Boolean(storageKey);
  const failed = output.status === "failed" || output.status === "provider_unavailable";

  const preview = await AvatarOutfitPreview.findOneAndUpdate(
    { userId: input.userId, outfitId: input.outfitId, cacheKey },
    {
      $set: {
        userId: input.userId,
        outfitId: input.outfitId,
        avatarProfileId: input.avatarProfileId,
        itemIds: loaded.itemIds,
        cacheKey,
        imageUrl,
        storageKey,
        provider: output.provider === "fashn" ? "fashn" : output.provider === "custom" ? "custom_tryon" : "s3",
        status: ready ? "ready" : failed ? "failed" : "generating",
        promptVersion: avatarPreviewPromptVersion,
        model: output.provider === "fashn" ? "fashn-tryon-max" : output.provider === "custom" ? "custom-vton" : "openai-tryon",
        visualizationStyle: avatarProfile.visualizationStyle || "luxury",
        posePreset: avatarProfile.posePreset || "standing",
        accuracyLevel: output.accuracyLevel.id || "true_3d_simulation",
        fitStatus: fitEvaluation.fitStatus,
        fitConfidence: fitEvaluation.fitConfidence,
        fitWarnings: [...fitEvaluation.warnings, ...outputWarnings].slice(0, 12),
        fitLockInstructions: fitEvaluation.lockedFitInstructions,
        groundedItemIds: grounding.groundedItemIds,
        missingVisualItemIds: grounding.missingVisualItemIds,
        visualizationWarnings: [...grounding.visualizationWarnings, ...outputWarnings].slice(0, 12),
        footwearIncluded: grounding.footwearIncluded,
        visualGroundingStatus: grounding.visualGroundingStatus,
        generatedAt: ready ? new Date() : null,
        errorMessage: failed ? failureMessage : "",
        lastAttemptAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await OutfitRecommendation.findOneAndUpdate(
    { _id: input.outfitId, userId: input.userId },
    {
      $set: {
        "preview.status": ready ? "ready" : failed ? "failed" : "generating",
        "preview.provider": output.provider === "fashn" ? "fashn" : output.provider === "custom" ? "custom_tryon" : "s3",
        "preview.storageKey": storageKey,
        "preview.imageUrl": imageUrl,
        "preview.cacheKey": cacheKey,
        "preview.promptVersion": avatarPreviewPromptVersion,
        "preview.model": output.provider === "fashn" ? "fashn-tryon-max" : output.provider === "custom" ? "custom-vton" : "openai-tryon",
        "preview.groundedItemIds": grounding.groundedItemIds,
        "preview.missingVisualItemIds": grounding.missingVisualItemIds,
        "preview.visualizationWarnings": [...grounding.visualizationWarnings, ...outputWarnings].slice(0, 12),
        "preview.footwearIncluded": grounding.footwearIncluded,
        "preview.visualGroundingStatus": grounding.visualGroundingStatus,
        "preview.generatedAt": ready ? new Date() : null,
        "preview.errorMessage": failed ? failureMessage : ""
      }
    }
  );

  return preview;
}

export async function runConfiguredVirtualTryOnJob(input: {
  userId: string;
  outfitId: string;
  avatarProfileId: string;
  wardrobeItemIds?: string[];
  desiredView?: TryOnDesiredView;
  visualizationStyle?: "minimal" | "luxury" | "streetwear" | "editorial";
  posePreset?: "standing" | "walking" | "editorial" | "runway" | "casual" | "side" | "back";
  cacheKey?: string;
}) {
  const providerType = getConfiguredTryOnProviderType();
  const provider = getTryOnProvider(providerType);
  const output = await provider.generateTryOnPreview({
    userId: input.userId,
    outfitRecommendationId: input.outfitId,
    avatarProfileId: input.avatarProfileId,
    wardrobeItemIds: input.wardrobeItemIds || [],
    desiredView: input.desiredView || "front",
    visualizationStyle: input.visualizationStyle,
    posePreset: input.posePreset,
    accuracyLevelRequested: providerType === "custom" || providerType === "fashn" ? "true_3d_simulation" : "garment_referenced",
    cacheKey: input.cacheKey
  });

  if (providerType === "internal_preview") {
    const loaded = await loadOwnedAvatarPreviewSubject(input.userId, input.outfitId);
    const cacheKey = input.cacheKey || (loaded
      ? buildAvatarCacheKeyFromItems(input.userId, input.outfitId, loaded.items, loaded.avatarProfile, {
          visualizationStyle: input.visualizationStyle || loaded.avatarProfile.visualizationStyle,
          posePreset: input.posePreset || loaded.avatarProfile.posePreset
        })
      : "");
    const preview = await AvatarOutfitPreview.findOne({ userId: input.userId, outfitId: input.outfitId, cacheKey }).lean();
    if (!preview && output.status === "failed") throw new Error(safeTryOnErrorMessage(output.warnings[0]));
    if (preview && !assertUsablePreviewRecord(preview)) throw new Error("Virtual try-on preview was not persisted correctly.");
    return { preview, cached: Boolean(output.cached), providerOutput: output };
  }

  const saved = await saveProviderPreview(input, output);
  if (!saved && output.status === "failed") throw new Error(safeTryOnErrorMessage(output.warnings[0]));
  if (!saved && output.status === "provider_unavailable") throw new Error(safeTryOnErrorMessage(output.warnings[0]));
  if (!saved || !assertUsablePreviewRecord(saved)) throw new Error("Virtual Try-On couldn't be completed. Your credit was not deducted.");
  return { preview: saved, cached: false, providerOutput: output };
}
