import { StudioModelAsset } from "@/models/StudioModelAsset";
import type { StudioModelAppearance } from "../appearance-taxonomy";
import { studioModelAppearanceKey } from "../configuration";
import { STUDIO_MODEL_CATALOG_VERSION } from "./asset-version";
import { getCachedStudioModelAsset } from "./asset-cache";
import { selectBestStudioModelFallback } from "./asset-selection";

export async function findStudioModelCatalogAsset(appearance: StudioModelAppearance, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  return getCachedStudioModelAsset(studioModelAppearanceKey(appearance), version);
}
export async function findStudioModelFallback(appearance: StudioModelAppearance, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  const candidates = await StudioModelAsset.find({ genderPresentation: appearance.gender, bodyType: appearance.bodyType, version, status: "READY", deprecatedAt: null, assetUrl: { $ne: "" } }).limit(250).lean();
  return selectBestStudioModelFallback(candidates, appearance);
}
export async function ensureStudioModelAssetRecord(appearance: StudioModelAppearance, version: string = STUDIO_MODEL_CATALOG_VERSION) {
  const appearanceKey = studioModelAppearanceKey(appearance);
  return StudioModelAsset.findOneAndUpdate({ appearanceKey, version }, { $setOnInsert: { appearanceKey, version, genderPresentation: appearance.gender, bodyType: appearance.bodyType, skinTone: appearance.skinTone, undertone: appearance.undertone || "", hairTexture: appearance.hairTexture, hairLength: appearance.hairLength, hairStyle: appearance.hairStyle, hairColor: appearance.hairColor, heightGroup: appearance.heightBand || "", status: "MISSING" } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}
