import { fallbackStudioModelForGender, resolveStudioModelImageUrl } from "@/lib/avatar/studio-models";
import { studioModelAppearanceKey, legacySelectionForAppearance, parseStudioModelAppearance } from "./configuration";
import { resolveStudioModelCatalog } from "./catalog/asset-resolution";
import { logStudioModelEvent } from "./observability";

export type StudioModelResolution = {
  imageUrl: string | null;
  appearanceKey: string | null;
  source: "exact_asset" | "catalog_fallback" | "legacy_compatible" | "safe_fallback" | "none";
  exactAppearance: boolean;
  warning: string | null;
};

export function resolveStudioModelForProfile(profile: any): StudioModelResolution {
  if (profile?.studioModelConfiguration) {
    const appearance = parseStudioModelAppearance(profile.studioModelConfiguration);
    const appearanceKey = studioModelAppearanceKey(appearance);
    if (profile.studioModelAppearanceKey === appearanceKey && profile.studioModelAssetStatus === "ready" && profile.studioModelImageUrl) {
      return { imageUrl: profile.studioModelImageUrl, appearanceKey, source: "exact_asset", exactAppearance: true, warning: null };
    }
    const legacy = legacySelectionForAppearance(appearance);
    const imageUrl = resolveStudioModelImageUrl(legacy.studioModelGender, legacy.studioModelType);
    return { imageUrl, appearanceKey, source: imageUrl ? "legacy_compatible" : "safe_fallback", exactAppearance: false, warning: "The selected body model is being used while the exact skin and hair asset is prepared." };
  }
  if (profile?.studioModelGender && profile?.studioModelType) {
    return { imageUrl: resolveStudioModelImageUrl(profile.studioModelGender, profile.studioModelType) || profile.studioModelImageUrl || null, appearanceKey: null, source: "legacy_compatible", exactAppearance: false, warning: null };
  }
  const imageUrl = fallbackStudioModelForGender(profile?.genderPresentation);
  return { imageUrl, appearanceKey: null, source: imageUrl ? "safe_fallback" : "none", exactAppearance: false, warning: imageUrl ? "Using a safe default Studio Model." : null };
}

export async function resolveStudioModelForTryOn(profile: any): Promise<StudioModelResolution> {
  if (!profile?.studioModelConfiguration) return resolveStudioModelForProfile(profile);
  const appearance = parseStudioModelAppearance(profile.studioModelConfiguration);
  try {
    const catalog = await resolveStudioModelCatalog(appearance, { userId: profile.userId ? String(profile.userId) : undefined });
    const chosen = catalog.asset || catalog.fallback;
    if (chosen?.assetUrl) return { imageUrl: chosen.assetUrl, appearanceKey: catalog.appearanceKey, source: catalog.asset ? "exact_asset" : "catalog_fallback", exactAppearance: Boolean(catalog.asset), warning: catalog.asset ? null : "Using the closest available Studio Model with the same presentation and body type while your exact model is prepared." };
  } catch {
    logStudioModelEvent("appearance_resolution_fallback", { appearanceKey: studioModelAppearanceKey(appearance), source: "catalog_unavailable" });
  }
  return resolveStudioModelForProfile(profile);
}
