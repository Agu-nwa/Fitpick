import { StudioModelAsset } from "@/models/StudioModelAsset";
import { studioModelOptions } from "@/lib/avatar/studio-models";
import { STUDIO_MODEL_APPEARANCE_VERSION, type StudioModelAppearance } from "../appearance-taxonomy";
import { studioModelAppearanceKey } from "../configuration";
import { STUDIO_MODEL_CATALOG_VERSION } from "./asset-version";

function legacyAppearance(gender: "male" | "female", type: string): StudioModelAppearance {
  return {
    version: STUDIO_MODEL_APPEARANCE_VERSION,
    representation: "studio_model",
    gender,
    bodyType: type === "plus-size" ? "plus_size" : type as StudioModelAppearance["bodyType"],
    skinTone: "tone_05",
    undertone: "neutral",
    hairTexture: "straight",
    hairLength: "short",
    hairColor: "black",
    hairStyle: "short_natural",
    heightBand: type === "petite" ? "short" : "average"
  };
}

export function legacyStudioModelSeedRecords(publicBaseUrl = "") {
  const base = publicBaseUrl.replace(/\/$/, "");
  return studioModelOptions.map((option) => {
    const appearance = legacyAppearance(option.gender, option.type);
    return {
      appearanceKey: studioModelAppearanceKey(appearance),
      version: STUDIO_MODEL_CATALOG_VERSION,
      assetUrl: base ? `${base}${option.imagePath}` : option.imagePath,
      storageKey: `public${option.imagePath}`,
      thumbnailUrl: base ? `${base}${option.imagePath}` : option.imagePath,
      genderPresentation: appearance.gender,
      bodyType: appearance.bodyType,
      skinTone: appearance.skinTone,
      undertone: (appearance.undertone || "") as "" | "cool" | "neutral" | "warm",
      hairTexture: appearance.hairTexture,
      hairLength: appearance.hairLength,
      hairStyle: appearance.hairStyle,
      hairColor: appearance.hairColor,
      heightGroup: appearance.heightBand || "",
      status: "FALLBACK" as const,
      qualityScore: 1,
      generatedBy: "legacy_static_import",
      provider: "fitpick_static",
      generationPromptVersion: "legacy-static-v1"
    };
  });
}

export async function importLegacyStudioModelAssets(publicBaseUrl = "") {
  const records = legacyStudioModelSeedRecords(publicBaseUrl);
  const operations = records.map((record) => ({
    updateOne: {
      filter: { appearanceKey: record.appearanceKey, version: record.version },
      update: { $setOnInsert: record },
      upsert: true
    }
  }));
  const result = await StudioModelAsset.bulkWrite(operations as any, { ordered: false });
  return { total: records.length, inserted: result.upsertedCount, existing: records.length - result.upsertedCount };
}

export async function ensureLegacyStudioModelFallback(gender: "male" | "female", bodyType: StudioModelAppearance["bodyType"], publicBaseUrl = "") {
  const record = legacyStudioModelSeedRecords(publicBaseUrl).find((item) => item.genderPresentation === gender && item.bodyType === bodyType);
  if (!record) return null;
  return StudioModelAsset.findOneAndUpdate(
    { appearanceKey: record.appearanceKey, version: record.version },
    { $setOnInsert: record },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
