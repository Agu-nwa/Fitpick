import type { FitEvaluation } from "@/lib/fit/fit-lock";
import type { PreviewAccuracyLevelId, getPreviewAccuracyLevel } from "@/lib/preview/preview-accuracy";
import type { PosePreset, VisualizationStyle } from "@/lib/avatar/avatar-profile";

export type TryOnProviderType =
  | "internal_preview"
  | "pictofit"
  | "clo_pipeline"
  | "browzwear_pipeline"
  | "fashn"
  | "custom"
  | "none";

export type TryOnDesiredView = "front" | "back" | "side" | "walking" | "360";

export type TryOnPreviewInput = {
  userId: string;
  avatarProfileId?: string;
  avatarMeasurements?: Record<string, unknown>;
  outfitRecommendationId?: string;
  wardrobeItemIds: string[];
  garmentAssets?: unknown[];
  garmentMeasurements?: Record<string, unknown>[];
  fitLockConstraints?: string | FitEvaluation;
  desiredView?: TryOnDesiredView;
  visualizationStyle?: VisualizationStyle;
  posePreset?: PosePreset;
  accuracyLevelRequested?: PreviewAccuracyLevelId;
  cacheKey?: string;
};

export type TryOnProviderOutput = {
  status: "queued" | "processing" | "ready" | "failed" | "provider_unavailable";
  provider: TryOnProviderType;
  previewUrls: string[];
  animationUrl?: string | null;
  modelUrl?: string | null;
  accuracyLevel: ReturnType<typeof getPreviewAccuracyLevel>;
  warnings: string[];
  jobId?: string | null;
  cached?: boolean;
};

export interface TryOnProvider {
  type: TryOnProviderType;
  generateTryOnPreview(input: TryOnPreviewInput): Promise<TryOnProviderOutput>;
  generateGarmentMesh(input: TryOnPreviewInput): Promise<TryOnProviderOutput>;
  generateAnimatedAvatarTryOn(input: TryOnPreviewInput): Promise<TryOnProviderOutput>;
  getTryOnJobStatus(jobId: string): Promise<TryOnProviderOutput>;
}
