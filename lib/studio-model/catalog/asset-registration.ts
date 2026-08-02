import { StudioModelAsset } from "@/models/StudioModelAsset";

export function validateAssetRegistration(input: { assetUrl: string; storageKey: string; thumbnailUrl: string; hash: string; qualityScore: number }) {
  if (!/^https:\/\//i.test(input.assetUrl) || !/^https:\/\//i.test(input.thumbnailUrl)) throw new Error("invalid_asset_url");
  if (!input.storageKey.startsWith("studio-model-assets/") || !/^[a-f0-9]{64}$/.test(input.hash)) throw new Error("invalid_asset_identity");
  if (!Number.isFinite(input.qualityScore) || input.qualityScore < 0 || input.qualityScore > 1) throw new Error("invalid_quality_score");
  return input;
}

export async function registerGeneratedStudioModelAsset(assetId: unknown, input: { assetUrl: string; storageKey: string; thumbnailUrl: string; thumbnailStorageKey?: string; hash: string; qualityScore: number; provider: string; providerModel?: string; generatedBy: string; generationPromptVersion: string; publicationStatus?: "READY" | "REVIEW_REQUIRED"; originalWidth?: number; originalHeight?: number; originalBytes?: number; originalFormat?: string; thumbnailWidth?: number; thumbnailHeight?: number; thumbnailBytes?: number; thumbnailFormat?: string }) {
  const safe = validateAssetRegistration(input);
  return StudioModelAsset.findOneAndUpdate({ _id: assetId, status: "GENERATING", assetUrl: "", thumbnailUrl: "" }, { $set: { ...safe, thumbnailStorageKey: String(input.thumbnailStorageKey || "").slice(0,512), status: input.publicationStatus || "READY", provider: input.provider.slice(0, 80), providerModel: String(input.providerModel || "").slice(0, 80), generatedBy: input.generatedBy.slice(0, 80), generationPromptVersion: input.generationPromptVersion.slice(0, 80), originalWidth: input.originalWidth || 0, originalHeight: input.originalHeight || 0, originalBytes: input.originalBytes || 0, originalFormat: input.originalFormat || "", thumbnailWidth: input.thumbnailWidth || 0, thumbnailHeight: input.thumbnailHeight || 0, thumbnailBytes: input.thumbnailBytes || 0, thumbnailFormat: input.thumbnailFormat || "", generatedAt: new Date(), generationLeaseExpiresAt: null, failureCode: "" } }, { new: true });
}
