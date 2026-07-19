import {
  runAvatarPreviewGenerationJob,
  serializeAvatarPreview
} from "@/lib/avatar/avatar-preview";
import { getPreviewAccuracyLevel } from "@/lib/preview/preview-accuracy";
import type { TryOnProvider, TryOnPreviewInput, TryOnProviderOutput } from "@/lib/tryon/types";

function unavailable(message: string): TryOnProviderOutput {
  return {
    status: "provider_unavailable",
    provider: "internal_preview",
    previewUrls: [],
    animationUrl: null,
    modelUrl: null,
    accuracyLevel: getPreviewAccuracyLevel("garment_referenced"),
    warnings: [message]
  };
}

export function createOpenAiTryOnProvider(): TryOnProvider {
  return {
    type: "internal_preview",
    async generateTryOnPreview(input: TryOnPreviewInput) {
      if (!input.outfitRecommendationId || !input.avatarProfileId) {
        return {
          ...unavailable("OpenAI virtual try-on fallback needs an outfit recommendation and avatar profile."),
          status: "failed"
        };
      }

      const result = await runAvatarPreviewGenerationJob({
        userId: input.userId,
        outfitId: input.outfitRecommendationId,
        avatarProfileId: input.avatarProfileId,
        visualizationStyle: input.visualizationStyle,
        posePreset: input.posePreset || (input.desiredView === "walking" ? "walking" : input.desiredView === "side" ? "side" : input.desiredView === "back" ? "back" : undefined),
        cacheKey: input.cacheKey
      });
      const preview = serializeAvatarPreview({ ...((result.preview as any)?.toObject?.() ?? result.preview), cached: result.cached });

      return {
        status: preview.status === "ready" ? "ready" : "processing",
        provider: "internal_preview",
        previewUrls: preview.imageUrl ? [preview.imageUrl] : [],
        animationUrl: null,
        modelUrl: null,
        accuracyLevel: preview.accuracyLevel || getPreviewAccuracyLevel("garment_referenced"),
        warnings: preview.fitWarnings || [],
        cached: result.cached
      };
    },
    async generateGarmentMesh() {
      return unavailable("Garment mesh generation requires a dedicated VTON, CLO, Browzwear, or custom 3D provider.");
    },
    async generateAnimatedAvatarTryOn(input: TryOnPreviewInput) {
      return this.generateTryOnPreview({ ...input, desiredView: input.desiredView || "360" });
    },
    async getTryOnJobStatus() {
      return unavailable("OpenAI virtual try-on fallback does not expose external job status.");
    }
  };
}
