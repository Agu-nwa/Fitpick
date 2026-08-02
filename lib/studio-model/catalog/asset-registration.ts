import { StudioModelAsset } from "@/models/StudioModelAsset";

export function validateAssetRegistration(input: { assetUrl: string; storageKey: string; thumbnailUrl: string; hash: string; qualityScore: number }) {
  if (!/^https:\/\//i.test(input.assetUrl) || !/^https:\/\//i.test(input.thumbnailUrl)) throw new Error("invalid_asset_url");
  if (!input.storageKey.startsWith("studio-model-assets/") || !/^[a-f0-9]{64}$/.test(input.hash)) throw new Error("invalid_asset_identity");
  if (!Number.isFinite(input.qualityScore) || input.qualityScore < 0 || input.qualityScore > 1) throw new Error("invalid_quality_score");
  return input;
}

export async function registerGeneratedStudioModelAsset(assetId: unknown, input: { assetUrl: string; storageKey: string; thumbnailUrl: string; hash: string; qualityScore: number; provider: string; generatedBy: string; generationPromptVersion: string }) {
  const safe = validateAssetRegistration(input);
  return StudioModelAsset.findByIdAndUpdate(assetId, { $set: { ...safe, status: "READY", provider: input.provider.slice(0, 80), generatedBy: input.generatedBy.slice(0, 80), generationPromptVersion: input.generationPromptVersion.slice(0, 80), failureCode: "" } }, { new: true });
}
