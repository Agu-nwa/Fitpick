import type { Types } from "mongoose";
import { AvatarProfile } from "@/models/AvatarProfile";
import {
  fallbackStudioModelForGender,
  isValidStudioModelSelection,
  resolveStudioModelImageUrl,
  type StudioModelGender,
  type StudioModelType
} from "@/lib/avatar/studio-models";
import { isBodyTypeAvailableForGender, type StudioModelAppearance } from "@/lib/studio-model/appearance-taxonomy";
import { legacySelectionForAppearance, parseStudioModelAppearance, studioModelAppearanceKey } from "@/lib/studio-model/configuration";
import { resolveStudioModelForProfile, resolveStudioModelForTryOn } from "@/lib/studio-model/model-resolver";
import { logStudioModelEvent } from "@/lib/studio-model/observability";
import { createSignedViewUrl, storageKeyBelongsToUser } from "@/lib/storage";
import { getProtectedStorageUrl, normalizeStorageKey } from "@/lib/storage/url";

export type GenderPresentation = "masculine" | "feminine" | "neutral";
export type BodyPreset = "slim" | "average" | "athletic" | "curvy" | "plus";
export type HeightPreset = "short" | "average" | "tall" | null;
export type PosePreset = "standing" | "walking" | "editorial" | "runway" | "casual" | "side" | "back";
export type VisualizationStyle = "minimal" | "luxury" | "streetwear" | "editorial";
export type AvatarProvider = "ready_player_me" | "fitpick_preset" | "custom_glb";
export type TryOnModelSource = "none" | "uploaded" | "generated" | "studio";
export type BodyMeasurementSource = "manual" | "estimated" | "body_scan" | "unknown";
export type BodyFitPreference = "true_to_size" | "slim" | "regular" | "relaxed" | "oversized";

export type AvatarProfilePatch = Partial<{
  genderPresentation: GenderPresentation;
  bodyPreset: BodyPreset;
  heightPreset: HeightPreset;
  skinTonePreset: string | null;
  hairStylePreset: string | null;
  posePreset: PosePreset;
  visualizationStyle: VisualizationStyle;
  avatarProvider: AvatarProvider;
  avatarUrl: string | null;
  tryOnModelSource: TryOnModelSource;
  uploadedModelImageUrl: string | null;
  uploadedModelImageStorageKey: string | null;
  generatedModelImageUrl: string | null;
  generatedModelImageStorageKey: string | null;
  studioModelGender: StudioModelGender | null;
  studioModelType: StudioModelType | null;
  studioModelImageUrl: string | null;
  studioModelConfiguration: StudioModelAppearance | null;
  consentAccepted: boolean;
  heightCm: number | null;
  weightKg: number | null;
  chestCm: number | null;
  bustCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  shoulderWidthCm: number | null;
  inseamCm: number | null;
  armLengthCm: number | null;
  neckCm: number | null;
  thighCm: number | null;
  shoeSize: string | null;
  bodyMeasurementSource: BodyMeasurementSource;
  bodyMeasurementConfidence: number;
  bodyFitPreference: BodyFitPreference;
}>;

const genderPresentations = new Set(["masculine", "feminine", "neutral"]);
const bodyPresets = new Set(["slim", "average", "athletic", "curvy", "plus"]);
const heightPresets = new Set(["short", "average", "tall"]);
const posePresets = new Set(["standing", "walking", "editorial", "runway", "casual", "side", "back"]);
const visualizationStyles = new Set(["minimal", "luxury", "streetwear", "editorial"]);
const avatarProviders = new Set(["ready_player_me", "fitpick_preset", "custom_glb"]);
const tryOnModelSources = new Set(["none", "uploaded", "generated", "studio"]);
const bodyMeasurementSources = new Set(["manual", "estimated", "body_scan", "unknown"]);
const bodyFitPreferences = new Set(["true_to_size", "slim", "regular", "relaxed", "oversized"]);

const measurementRanges: Record<string, [number, number]> = {
  heightCm: [90, 240],
  weightKg: [25, 260],
  chestCm: [45, 180],
  bustCm: [45, 180],
  waistCm: [40, 180],
  hipsCm: [45, 200],
  shoulderWidthCm: [25, 80],
  inseamCm: [35, 130],
  armLengthCm: [30, 110],
  neckCm: [20, 70],
  thighCm: [25, 110]
};

const measurementKeys = Object.keys(measurementRanges) as Array<keyof AvatarProfilePatch>;

function cleanString(value?: string | null, max = 60) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
}

function cleanMeasurement(key: keyof AvatarProfilePatch, value: unknown) {
  if (value === null || value === "") return null;
  const range = measurementRanges[String(key)];
  const numeric = Number(value);
  if (!range || !Number.isFinite(numeric)) return undefined;
  const [min, max] = range;
  if (numeric < min || numeric > max) return undefined;
  return Math.round(numeric * 10) / 10;
}

function clampConfidence(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, Math.round(numeric * 100) / 100));
}

export function validateAvatarUrl(value?: string | null, provider: AvatarProvider = "custom_glb") {
  const cleaned = cleanString(value, 2048);
  if (!cleaned) return null;

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("invalid_avatar_url");
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("invalid_avatar_url");
  }

  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname.toLowerCase();
  if (!path.endsWith(".glb")) throw new Error("invalid_avatar_url");

  if (provider === "ready_player_me" && !host.endsWith("readyplayer.me")) {
    throw new Error("invalid_avatar_url");
  }

  parsed.hash = "";
  parsed.search = "";
  return parsed.toString();
}

export function validateModelImageUrl(value?: string | null) {
  const cleaned = cleanString(value, 2048);
  if (!cleaned) return null;

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new Error("invalid_model_image_url");
  }

  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("invalid_model_image_url");
  }

  parsed.hash = "";
  return parsed.toString();
}

export async function preferredTryOnModelImageUrl(profile: any) {
  if (profile?.studioModelConfiguration || (profile?.studioModelGender && profile?.studioModelType)) return (await resolveStudioModelForTryOn(profile)).imageUrl;
  if (profile?.tryOnModelSource === "generated" && profile?.generatedModelImageStorageKey) {
    return (await createSignedViewUrl({ storageKey: profile.generatedModelImageStorageKey })).viewUrl || profile.generatedModelImageUrl;
  }
  if (profile?.tryOnModelSource === "uploaded" && profile?.uploadedModelImageStorageKey) {
    return (await createSignedViewUrl({ storageKey: profile.uploadedModelImageStorageKey })).viewUrl || profile.uploadedModelImageUrl;
  }
  if (profile?.tryOnModelSource === "generated" && profile?.generatedModelImageUrl) return profile.generatedModelImageUrl;
  if (profile?.tryOnModelSource === "uploaded" && profile?.uploadedModelImageUrl) return profile.uploadedModelImageUrl;
  return fallbackStudioModelForGender(profile?.genderPresentation);
}

export async function getOrCreateAvatarProfile(userId: string | Types.ObjectId) {
  return (
    (await AvatarProfile.findOne({ userId })) ||
    (await AvatarProfile.create({ userId }))
  );
}

export async function updateAvatarProfile(userId: string | Types.ObjectId, patch: AvatarProfilePatch) {
  const ownerId = String(userId);
  const cleaned: AvatarProfilePatch = {};
  const provider = (patch.avatarProvider && avatarProviders.has(patch.avatarProvider))
    ? patch.avatarProvider
    : undefined;

  if (patch.genderPresentation && genderPresentations.has(patch.genderPresentation)) cleaned.genderPresentation = patch.genderPresentation;
  if (patch.bodyPreset && bodyPresets.has(patch.bodyPreset)) cleaned.bodyPreset = patch.bodyPreset;
  if (patch.heightPreset === null) cleaned.heightPreset = null;
  if (patch.heightPreset && heightPresets.has(patch.heightPreset)) cleaned.heightPreset = patch.heightPreset;
  if (patch.posePreset && posePresets.has(patch.posePreset)) cleaned.posePreset = patch.posePreset;
  if (patch.visualizationStyle && visualizationStyles.has(patch.visualizationStyle)) cleaned.visualizationStyle = patch.visualizationStyle;
  if (provider) cleaned.avatarProvider = provider;
  if (patch.tryOnModelSource && tryOnModelSources.has(patch.tryOnModelSource)) cleaned.tryOnModelSource = patch.tryOnModelSource;
  if (patch.bodyMeasurementSource && bodyMeasurementSources.has(patch.bodyMeasurementSource)) cleaned.bodyMeasurementSource = patch.bodyMeasurementSource;
  if (patch.bodyFitPreference && bodyFitPreferences.has(patch.bodyFitPreference)) cleaned.bodyFitPreference = patch.bodyFitPreference;
  if ("bodyMeasurementConfidence" in patch) cleaned.bodyMeasurementConfidence = clampConfidence(patch.bodyMeasurementConfidence);
  if ("skinTonePreset" in patch) cleaned.skinTonePreset = cleanString(patch.skinTonePreset);
  if ("hairStylePreset" in patch) cleaned.hairStylePreset = cleanString(patch.hairStylePreset);
  if ("shoeSize" in patch) cleaned.shoeSize = cleanString(patch.shoeSize, 40) || "";
  if (typeof patch.consentAccepted === "boolean") cleaned.consentAccepted = patch.consentAccepted;

  for (const key of measurementKeys) {
    if (key in patch) {
      const value = cleanMeasurement(key, patch[key]);
      if (value !== undefined) (cleaned as any)[key] = value;
    }
  }

  if ("avatarUrl" in patch) {
    const activeProvider = provider || "custom_glb";
    cleaned.avatarUrl = activeProvider === "fitpick_preset" ? null : validateAvatarUrl(patch.avatarUrl, activeProvider);
  }

  if ("uploadedModelImageUrl" in patch) cleaned.uploadedModelImageUrl = validateModelImageUrl(patch.uploadedModelImageUrl);
  if ("uploadedModelImageStorageKey" in patch) {
    const storageKey = normalizeStorageKey(cleanString(patch.uploadedModelImageStorageKey, 512) || "");
    if (storageKey && !storageKeyBelongsToUser({ userId: ownerId, storageKey, prefix: "wardrobe" })) {
      throw new Error("invalid_model_image_storage_key");
    }
    cleaned.uploadedModelImageStorageKey = storageKey || null;
  }
  if ("generatedModelImageUrl" in patch) cleaned.generatedModelImageUrl = validateModelImageUrl(patch.generatedModelImageUrl);
  if ("generatedModelImageStorageKey" in patch) {
    const storageKey = normalizeStorageKey(cleanString(patch.generatedModelImageStorageKey, 512) || "");
    const owned = !storageKey || ["wardrobe", "generated-previews", "avatar-previews"].some((prefix) =>
      storageKeyBelongsToUser({ userId: ownerId, storageKey, prefix: prefix as "wardrobe" | "generated-previews" | "avatar-previews" })
    );
    if (!owned) throw new Error("invalid_model_image_storage_key");
    cleaned.generatedModelImageStorageKey = storageKey || null;
  }
  if ("studioModelConfiguration" in patch) {
    if (patch.studioModelConfiguration === null) {
      cleaned.studioModelConfiguration = null;
      (cleaned as any).studioModelAppearanceKey = null;
      (cleaned as any).studioModelAssetStatus = null;
    } else {
      const appearance = parseStudioModelAppearance(patch.studioModelConfiguration);
      if (!isBodyTypeAvailableForGender(appearance.gender, appearance.bodyType)) throw new Error("invalid_studio_model_selection");
      const legacy = legacySelectionForAppearance(appearance);
      cleaned.studioModelConfiguration = appearance;
      cleaned.studioModelGender = legacy.studioModelGender;
      cleaned.studioModelType = legacy.studioModelType;
      cleaned.studioModelImageUrl = resolveStudioModelImageUrl(legacy.studioModelGender, legacy.studioModelType);
      (cleaned as any).studioModelAppearanceKey = studioModelAppearanceKey(appearance);
      (cleaned as any).studioModelAssetStatus = "fallback";
      (cleaned as any).studioModelFallbackReason = "exact_asset_pending";
      cleaned.tryOnModelSource = "studio";
      cleaned.genderPresentation = appearance.gender === "male" ? "masculine" : "feminine";
      cleaned.heightPreset = appearance.heightBand || null;
      cleaned.skinTonePreset = appearance.skinTone;
      cleaned.hairStylePreset = `${appearance.hairColor} ${appearance.hairStyle}`;
    }
  }
  if ("studioModelGender" in patch || "studioModelType" in patch) {
    const gender = patch.studioModelGender ?? null;
    const type = patch.studioModelType ?? null;
    if (gender === null || type === null) {
      cleaned.studioModelGender = null;
      cleaned.studioModelType = null;
      cleaned.studioModelImageUrl = null;
      if (cleaned.tryOnModelSource === "studio") cleaned.tryOnModelSource = "none";
    } else if (isValidStudioModelSelection(gender, type)) {
      cleaned.studioModelGender = gender;
      cleaned.studioModelType = type;
      cleaned.studioModelImageUrl = resolveStudioModelImageUrl(gender, type);
      cleaned.tryOnModelSource = "studio";
      cleaned.genderPresentation = gender === "male" ? "masculine" : "feminine";
      if (type === "petite") cleaned.heightPreset = "short";
      if (type === "athletic") cleaned.bodyPreset = "athletic";
      if (type === "curvy") cleaned.bodyPreset = "curvy";
      if (type === "plus-size") cleaned.bodyPreset = "plus";
      if (type === "standard" || type === "broad" || type === "maternity") cleaned.bodyPreset = "average";
    } else {
      throw new Error("invalid_studio_model_selection");
    }
  }

  const profile = await AvatarProfile.findOneAndUpdate(
    { userId },
    { $set: cleaned },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (cleaned.studioModelConfiguration) {
    logStudioModelEvent("appearance_updated", { appearanceKey: (cleaned as any).studioModelAppearanceKey, source: "profile", completed: true });
  }
  return profile;
}

function avatarBaseLabel(value?: string | null) {
  if (value === "masculine") return "male";
  if (value === "feminine") return "female";
  return "not specified";
}

export function buildAvatarPromptContext(profile: any) {
  return [
    `Avatar base: ${avatarBaseLabel(profile.genderPresentation)}`,
    `Body preset: ${profile.bodyPreset || "average"} styling visualization preset only`,
    `Height preset: ${profile.heightPreset || "unspecified"}`,
    `Pose: ${profile.posePreset || "standing"}`,
    `Visualization style: ${profile.visualizationStyle || "luxury"}`,
    profile.skinTonePreset ? `Skin tone preset: ${profile.skinTonePreset}` : "",
    profile.hairStylePreset ? `Hair style preset: ${profile.hairStylePreset}` : "",
    profile.heightCm ? `Height: ${profile.heightCm} cm` : "",
    profile.chestCm ? `Chest: ${profile.chestCm} cm` : "",
    profile.bustCm ? `Bust: ${profile.bustCm} cm` : "",
    profile.waistCm ? `Waist: ${profile.waistCm} cm` : "",
    profile.hipsCm ? `Hips: ${profile.hipsCm} cm` : "",
    profile.shoulderWidthCm ? `Shoulder width: ${profile.shoulderWidthCm} cm` : "",
    profile.inseamCm ? `Inseam: ${profile.inseamCm} cm` : "",
    profile.armLengthCm ? `Arm length: ${profile.armLengthCm} cm` : "",
    profile.shoeSize ? `Shoe size: ${profile.shoeSize}` : "",
    `Body measurement source: ${profile.bodyMeasurementSource || "unknown"}`,
    `Body fit preference: ${profile.bodyFitPreference || "regular"}`,
    `Body measurement confidence: ${typeof profile.bodyMeasurementConfidence === "number" ? profile.bodyMeasurementConfidence : 0}`,
    "Measurements improve fit visualization only and must not be used to infer identity."
  ].filter(Boolean).join("\n");
}

export function serializeAvatarProfile(profile: any) {
  const resolution = resolveStudioModelForProfile(profile);
  const uploadedModelImageUrl = profile.uploadedModelImageStorageKey
    ? getProtectedStorageUrl(profile.uploadedModelImageStorageKey)
    : profile.uploadedModelImageUrl || null;
  const generatedModelImageUrl = profile.generatedModelImageStorageKey
    ? getProtectedStorageUrl(profile.generatedModelImageStorageKey)
    : profile.generatedModelImageUrl || null;
  return {
    id: String(profile._id),
    genderPresentation: profile.genderPresentation || "neutral",
    bodyPreset: profile.bodyPreset || "average",
    heightPreset: profile.heightPreset ?? null,
    skinTonePreset: profile.skinTonePreset ?? null,
    hairStylePreset: profile.hairStylePreset ?? null,
    posePreset: profile.posePreset || "standing",
    visualizationStyle: profile.visualizationStyle || "luxury",
    avatarProvider: profile.avatarProvider || "fitpick_preset",
    avatarUrl: profile.avatarUrl || null,
    glbStorageKey: profile.glbStorageKey || null,
    tryOnModelSource: profile.tryOnModelSource || "none",
    uploadedModelImageUrl,
    uploadedModelImageStorageKey: profile.uploadedModelImageStorageKey || null,
    generatedModelImageUrl,
    generatedModelImageStorageKey: profile.generatedModelImageStorageKey || null,
    generatedModelPromptVersion: profile.generatedModelPromptVersion || "",
    generatedModelAt: profile.generatedModelAt ? new Date(profile.generatedModelAt).toISOString() : null,
    studioModelGender: profile.studioModelGender || null,
    studioModelType: profile.studioModelType || null,
    studioModelImageUrl: resolution.imageUrl,
    studioModelConfiguration: profile.studioModelConfiguration?.toObject?.() || profile.studioModelConfiguration || null,
    studioModelAppearanceKey: profile.studioModelAppearanceKey || resolution.appearanceKey,
    studioModelAssetStatus: profile.studioModelAssetStatus || null,
    studioModelAssetId: profile.studioModelAssetId || null,
    studioModelExactAppearance: resolution.exactAppearance,
    studioModelWarning: resolution.warning,
    heightCm: profile.heightCm ?? null,
    weightKg: profile.weightKg ?? null,
    chestCm: profile.chestCm ?? null,
    bustCm: profile.bustCm ?? null,
    waistCm: profile.waistCm ?? null,
    hipsCm: profile.hipsCm ?? null,
    shoulderWidthCm: profile.shoulderWidthCm ?? null,
    inseamCm: profile.inseamCm ?? null,
    armLengthCm: profile.armLengthCm ?? null,
    neckCm: profile.neckCm ?? null,
    thighCm: profile.thighCm ?? null,
    shoeSize: profile.shoeSize || "",
    bodyMeasurementSource: profile.bodyMeasurementSource || "unknown",
    bodyMeasurementConfidence: typeof profile.bodyMeasurementConfidence === "number" ? profile.bodyMeasurementConfidence : 0,
    bodyFitPreference: profile.bodyFitPreference || "regular",
    consentAccepted: Boolean(profile.consentAccepted),
    createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : null,
    updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : null
  };
}
