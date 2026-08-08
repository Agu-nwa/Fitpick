import type { FitEvaluation } from "@/lib/fit/fit-lock";
import type { PreviewAccuracyLevelId, getPreviewAccuracyLevel } from "@/lib/preview/preview-accuracy";
import type { PosePreset, VisualizationStyle } from "@/lib/avatar/avatar-profile";
import type { PreviewFidelityLevel, TryOnVisualRole } from "@/lib/tryon/provider-capabilities";

export type TryOnProviderType =
  | "internal_preview"
  | "pictofit"
  | "clo_pipeline"
  | "browzwear_pipeline"
  | "fashn"
  | "custom"
  | "none";

export type TryOnDesiredView = "front" | "back" | "side" | "walking" | "360";
export type TryOnProgressStage = "not_started" | "core_ready" | "finishing" | "complete" | "fallback";

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
  onProgress?: (output: TryOnProviderOutput) => Promise<void>;
};

export type TryOnProviderOutput = {
  status: "queued" | "processing" | "ready" | "failed" | "provider_unavailable";
  provider: TryOnProviderType;
  previewUrls: string[];
  previewStorageKeys?: string[];
  animationUrl?: string | null;
  modelUrl?: string | null;
  accuracyLevel: ReturnType<typeof getPreviewAccuracyLevel>;
  warnings: string[];
  jobId?: string | null;
  cached?: boolean;
  providerDiagnostics?: Record<string, unknown>;
  requestedRoles?: TryOnVisualRole[];
  providerSupportedRoles?: TryOnVisualRole[];
  partiallySupportedRoles?: TryOnVisualRole[];
  unsupportedRoles?: TryOnVisualRole[];
  previewFidelityLevel?: PreviewFidelityLevel;
  providerSentItemIds?: string[];
  providerCompletedItemIds?: string[];
  pendingItemIds?: string[];
  recommendationOnlyItemIds?: string[];
  progressStage?: TryOnProgressStage;
};

export interface TryOnProvider {
  type: TryOnProviderType;
  generateTryOnPreview(input: TryOnPreviewInput): Promise<TryOnProviderOutput>;
  generateGarmentMesh(input: TryOnPreviewInput): Promise<TryOnProviderOutput>;
  generateAnimatedAvatarTryOn(input: TryOnPreviewInput): Promise<TryOnProviderOutput>;
  getTryOnJobStatus(jobId: string): Promise<TryOnProviderOutput>;
}
