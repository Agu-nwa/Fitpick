import { getAiModel } from "@/lib/ai/models/registry";
import { openai } from "@/lib/ai/openai";
import { StudioModelAsset } from "@/models/StudioModelAsset";
import { buildStudioModelPrompt, studioModelAppearanceKey, parseStudioModelAppearance } from "../configuration";
import { STUDIO_MODEL_CATALOG_VERSION, STUDIO_MODEL_GENERATION_PROMPT_VERSION } from "./asset-version";
import { validateStudioModelAsset } from "./asset-validation";
import { storeStudioModelAsset } from "./asset-storage";
import { studioModelAssetHash } from "./asset-hash";
import { registerGeneratedStudioModelAsset } from "./asset-registration";
import { safeStudioModelFailureCode } from "./failure-codes";
import { deterministicStudioModelStub } from "./integration-provider";

export function studioModelGenerationEnabled() { return process.env.STUDIO_MODEL_ASSET_GENERATION_ENABLED === "true" || process.env.STUDIO_MODEL_INTEGRATION_TEST_ENABLED === "true"; }

export async function claimStudioModelGeneration(appearanceKey: string, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  const now = new Date();
  return StudioModelAsset.findOneAndUpdate({ appearanceKey, version, status: { $in: ["MISSING", "FAILED", "FALLBACK"] }, generationAttemptCount: { $lt: 3 }, $or: [{ generationLeaseExpiresAt: null }, { generationLeaseExpiresAt: { $lte: now } }] }, { $set: { status: "GENERATING", failureCode: "", generationClaimedAt: now, generationLeaseExpiresAt: new Date(now.getTime() + 10 * 60_000) }, $inc: { generationAttemptCount: 1 } }, { new: true });
}

export async function generateStudioModelAsset(configuration: unknown, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  if (!studioModelGenerationEnabled()) throw new Error("studio_model_generation_disabled");
  const appearance = parseStudioModelAppearance(configuration);
  const appearanceKey = studioModelAppearanceKey(appearance);
  const asset = await StudioModelAsset.findOne({ appearanceKey, version, status: "GENERATING", generationLeaseExpiresAt: { $gt: new Date() } });
  if (!asset) throw new Error("generation_lease_expired");
  try {
    const model = getAiModel("imageGeneration");
    const useStub = process.env.STUDIO_MODEL_INTEGRATION_TEST_ENABLED === "true" && process.env.STUDIO_MODEL_INTEGRATION_PROVIDER !== "real";
    const generated = useStub ? await deterministicStudioModelStub.generate(buildStudioModelPrompt(appearance)) : null;
    const response = generated ? null : await openai.images.generate({ model, prompt: buildStudioModelPrompt(appearance), size: "1024x1536", quality: "high", output_format: "png" });
    const base64 = response?.data?.[0]?.b64_json;
    if (!generated && !base64) throw new Error("studio_model_generation_empty");
    const body = generated?.body || Buffer.from(base64 || "", "base64");
    const validation = useStub ? { accepted:true,reviewRequired:false,qualityScore:1,checks:{stub:true},width:1024,height:1536,format:"png" } : await validateStudioModelAsset(body, appearance);
    if (!validation.accepted) {
      return StudioModelAsset.findByIdAndUpdate(asset._id, { $set: { status: validation.reviewRequired ? "REVIEW_REQUIRED" : "FAILED", qualityScore: validation.qualityScore, failureCode: "asset_validation_failed", provider: "openai", generatedBy: "background_job", generationPromptVersion: STUDIO_MODEL_GENERATION_PROMPT_VERSION } }, { new: true });
    }
    const hash = studioModelAssetHash(body);
    const duplicate = await StudioModelAsset.findOne({ hash, assetUrl: { $ne: "" }, storageKey: { $ne: "" } }).lean();
    const stored = duplicate ? { hash, assetUrl: duplicate.assetUrl, storageKey: duplicate.storageKey, thumbnailUrl: duplicate.thumbnailUrl } : await storeStudioModelAsset(body, appearanceKey, version);
    return registerGeneratedStudioModelAsset(asset._id, { ...stored, qualityScore: validation.qualityScore, provider: useStub ? "deterministic_stub" : "openai", providerModel: useStub ? "fixture-v1" : model, generatedBy: "background_job", generationPromptVersion: STUDIO_MODEL_GENERATION_PROMPT_VERSION, publicationStatus: process.env.STUDIO_MODEL_REQUIRE_HUMAN_APPROVAL === "false" ? "READY" : "REVIEW_REQUIRED", originalWidth: validation.width, originalHeight: validation.height, originalBytes: body.byteLength, originalFormat: validation.format });
  } catch (error) {
    await StudioModelAsset.findByIdAndUpdate(asset._id, { $set: { status: "FAILED", failureCode: safeStudioModelFailureCode(error), generationLeaseExpiresAt: null } });
    throw error;
  }
}

export async function generateStudioModelAssetByKey(appearanceKey: string, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  const asset = await StudioModelAsset.findOne({ appearanceKey, version }).lean();
  if (!asset) throw new Error("studio_model_asset_not_found");
  return generateStudioModelAsset({ version: "studio-model-v1", representation: "studio_model", gender: asset.genderPresentation, bodyType: asset.bodyType, skinTone: asset.skinTone, undertone: asset.undertone || undefined, hairTexture: asset.hairTexture, hairLength: asset.hairLength, hairColor: asset.hairColor, hairStyle: asset.hairStyle, heightBand: asset.heightGroup || undefined }, version);
}
