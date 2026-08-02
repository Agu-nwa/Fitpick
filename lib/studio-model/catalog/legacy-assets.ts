import { studioModelOptions } from "@/lib/avatar/studio-models";

export function legacyStudioModelCandidates(publicBaseUrl = "") {
  const base = publicBaseUrl.replace(/\/$/, "");
  return studioModelOptions.map((option) => ({
    definitionId: `${option.gender}-${option.type}`,
    assetUrl: base ? `${base}${option.imagePath}` : option.imagePath,
    genderPresentation: option.gender,
    bodyType: option.type === "plus-size" ? "plus_size" : option.type,
    sourceType: "legacy_import" as const,
    exactMapping: false,
    appearanceKey: null,
    warnings: ["skin_tone_not_declared", "hair_texture_not_declared", "hair_style_not_declared", "hair_color_not_declared"]
  }));
}

export async function inspectLegacyStudioModelAssets(publicBaseUrl = "", limit = 100) {
  const candidates = legacyStudioModelCandidates(publicBaseUrl).slice(0, Math.max(1, Math.min(limit, 100)));
  return { totalLegacyDefinitions: studioModelOptions.length, mappedExactly: 0, mappedWithWarnings: 0, unresolved: candidates.length, alreadyRegistered: 0, contentDuplicates: 0, wouldCreate: 0, wouldSkip: candidates.length, candidates };
}
