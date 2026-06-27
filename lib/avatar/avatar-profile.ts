import type { Types } from "mongoose";
import { AvatarProfile } from "@/models/AvatarProfile";

export type GenderPresentation = "masculine" | "feminine" | "neutral";
export type BodyPreset = "slim" | "average" | "athletic" | "curvy" | "plus";
export type HeightPreset = "short" | "average" | "tall" | null;
export type PosePreset = "standing" | "walking" | "editorial" | "runway" | "casual";
export type VisualizationStyle = "minimal" | "luxury" | "streetwear" | "editorial";
export type AvatarProvider = "ready_player_me" | "fitpick_preset" | "custom_glb";

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
  consentAccepted: boolean;
}>;

const genderPresentations = new Set(["masculine", "feminine", "neutral"]);
const bodyPresets = new Set(["slim", "average", "athletic", "curvy", "plus"]);
const heightPresets = new Set(["short", "average", "tall"]);
const posePresets = new Set(["standing", "walking", "editorial", "runway", "casual"]);
const visualizationStyles = new Set(["minimal", "luxury", "streetwear", "editorial"]);
const avatarProviders = new Set(["ready_player_me", "fitpick_preset", "custom_glb"]);

function cleanString(value?: string | null, max = 60) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, max) : null;
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

export async function getOrCreateAvatarProfile(userId: string | Types.ObjectId) {
  return (
    (await AvatarProfile.findOne({ userId })) ||
    (await AvatarProfile.create({ userId }))
  );
}

export async function updateAvatarProfile(userId: string | Types.ObjectId, patch: AvatarProfilePatch) {
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
  if ("skinTonePreset" in patch) cleaned.skinTonePreset = cleanString(patch.skinTonePreset);
  if ("hairStylePreset" in patch) cleaned.hairStylePreset = cleanString(patch.hairStylePreset);
  if (typeof patch.consentAccepted === "boolean") cleaned.consentAccepted = patch.consentAccepted;

  if ("avatarUrl" in patch) {
    const activeProvider = provider || "custom_glb";
    cleaned.avatarUrl = activeProvider === "fitpick_preset" ? null : validateAvatarUrl(patch.avatarUrl, activeProvider);
  }

  return AvatarProfile.findOneAndUpdate(
    { userId },
    { $set: cleaned },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

export function buildAvatarPromptContext(profile: any) {
  return [
    `Gender presentation: ${profile.genderPresentation || "neutral"}`,
    `Body preset: ${profile.bodyPreset || "average"} styling visualization preset only`,
    `Height preset: ${profile.heightPreset || "unspecified"}`,
    `Pose: ${profile.posePreset || "standing"}`,
    `Visualization style: ${profile.visualizationStyle || "luxury"}`,
    profile.skinTonePreset ? `Skin tone preset: ${profile.skinTonePreset}` : "",
    profile.hairStylePreset ? `Hair style preset: ${profile.hairStylePreset}` : "",
    "No exact body measurements are provided or implied."
  ].filter(Boolean).join("\n");
}

export function serializeAvatarProfile(profile: any) {
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
    consentAccepted: Boolean(profile.consentAccepted),
    createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : null,
    updatedAt: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : null
  };
}
