import { getAiModel } from "@/lib/ai/models/registry";
import { openai } from "@/lib/ai/openai";
import { StudioModelAsset } from "@/models/StudioModelAsset";
import { buildStudioModelPrompt, studioModelAppearanceKey, parseStudioModelAppearance } from "../configuration";
import { STUDIO_MODEL_CATALOG_VERSION, STUDIO_MODEL_GENERATION_PROMPT_VERSION } from "./asset-version";
import { validateStudioModelAsset } from "./asset-validation";
import { storeStudioModelAsset } from "./asset-storage";
import { studioModelAssetHash } from "./asset-hash";
import { registerGeneratedStudioModelAsset } from "./asset-registration";

export function studioModelGenerationEnabled() { return process.env.STUDIO_MODEL_ASSET_GENERATION_ENABLED === "true"; }

export async function claimStudioModelGeneration(appearanceKey: string, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  return StudioModelAsset.findOneAndUpdate({ appearanceKey, version, status: { $in: ["GENERATING", "FAILED"] } }, { $set: { status: "GENERATING", failureCode: "" } }, { new: true });
}

export async function generateStudioModelAsset(configuration: unknown, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  if (!studioModelGenerationEnabled()) throw new Error("studio_model_generation_disabled");
  const appearance = parseStudioModelAppearance(configuration);
  const appearanceKey = studioModelAppearanceKey(appearance);
  const asset = await claimStudioModelGeneration(appearanceKey, version);
  if (!asset) return StudioModelAsset.findOne({ appearanceKey, version });
  try {
    const model = getAiModel("imageGeneration");
    const response = await openai.images.generate({ model, prompt: buildStudioModelPrompt(appearance), size: "1024x1536", quality: "high", output_format: "png" });
    const base64 = response.data?.[0]?.b64_json;
    if (!base64) throw new Error("studio_model_generation_empty");
    const body = Buffer.from(base64, "base64");
    const validation = await validateStudioModelAsset(body, appearance);
    if (!validation.accepted) {
      return StudioModelAsset.findByIdAndUpdate(asset._id, { $set: { status: validation.reviewRequired ? "REVIEW_REQUIRED" : "FAILED", qualityScore: validation.qualityScore, failureCode: "asset_validation_failed", provider: "openai", generatedBy: "background_job", generationPromptVersion: STUDIO_MODEL_GENERATION_PROMPT_VERSION } }, { new: true });
    }
    const hash = studioModelAssetHash(body);
    const duplicate = await StudioModelAsset.findOne({ hash, assetUrl: { $ne: "" }, storageKey: { $ne: "" } }).lean();
    const stored = duplicate ? { hash, assetUrl: duplicate.assetUrl, storageKey: duplicate.storageKey, thumbnailUrl: duplicate.thumbnailUrl } : await storeStudioModelAsset(body, appearanceKey, version);
    return registerGeneratedStudioModelAsset(asset._id, { ...stored, qualityScore: validation.qualityScore, provider: "openai", generatedBy: "background_job", generationPromptVersion: STUDIO_MODEL_GENERATION_PROMPT_VERSION });
  } catch (error) {
    await StudioModelAsset.findByIdAndUpdate(asset._id, { $set: { status: "FAILED", failureCode: error instanceof Error ? error.message.slice(0, 80) : "generation_failed" } });
    throw error;
  }
}

export async function generateStudioModelAssetByKey(appearanceKey: string, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  const asset = await StudioModelAsset.findOne({ appearanceKey, version }).lean();
  if (!asset) throw new Error("studio_model_asset_not_found");
  return generateStudioModelAsset({ version: "studio-model-v1", representation: "studio_model", gender: asset.genderPresentation, bodyType: asset.bodyType, skinTone: asset.skinTone, undertone: asset.undertone || undefined, hairTexture: asset.hairTexture, hairLength: asset.hairLength, hairColor: asset.hairColor, hairStyle: asset.hairStyle, heightBand: asset.heightGroup || undefined }, version);
}
