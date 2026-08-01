export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { createAppearancePreview, appearancePreviewKey, appearancePreviewPromptVersion } from "@/lib/avatar/appearance-preview";
import { hairColorPresetValues, skinTonePresetValues } from "@/lib/avatar/appearance-presets";
import { serializeAvatarProfile } from "@/lib/avatar/avatar-profile";
import { isValidStudioModelSelection } from "@/lib/avatar/studio-models";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { AvatarProfile } from "@/models/AvatarProfile";

const schema = z.object({
  gender: z.enum(["male", "female"]),
  modelType: z.enum(["standard", "petite", "athletic", "broad", "curvy", "plus-size", "maternity"]),
  skinTone: z.enum(skinTonePresetValues),
  hairColor: z.enum(hairColorPresetValues)
}).strict();

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `appearance-preview:${meta.ip}`, limit: 12, windowMs: 60_000, operation: "appearance-preview" });
  if (limited) return limited;
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(schema, await readJson(request));
    if (!parsed.ok) return parsed.response;
    const input = parsed.data;
    if (!isValidStudioModelSelection(input.gender, input.modelType)) return apiError("VALIDATION_ERROR", "Choose a valid Studio Model.");
    const key = appearancePreviewKey(input);
    const existing = await AvatarProfile.findOne({ userId: auth.user._id });
    if (existing?.generatedModelAppearanceKey === key && existing.generatedModelImageUrl) {
      return apiSuccess({ previewUrl: existing.generatedModelImageUrl, appearanceKey: key, profile: serializeAvatarProfile(existing) });
    }
    const generated = await createAppearancePreview(String(auth.user._id), input);
    const profile = await AvatarProfile.findOneAndUpdate(
      { userId: auth.user._id, studioModelGender: input.gender, studioModelType: input.modelType, skinTonePreset: input.skinTone, hairColorPreset: input.hairColor },
      { $set: { generatedModelImageUrl: generated.url, generatedModelImageStorageKey: generated.storageKey, generatedModelAppearanceKey: key, generatedModelPromptVersion: appearancePreviewPromptVersion, generatedModelAt: new Date() } },
      { new: true }
    );
    if (!profile) return apiError("CONFLICT", "Your appearance changed while the preview was being prepared. Please try again.");
    return apiSuccess({ previewUrl: generated.url, appearanceKey: key, profile: serializeAvatarProfile(profile) });
  } catch (error) {
    logSafeError("avatar-profile.appearance-preview", error);
    return apiError("INTERNAL_ERROR", "We couldn’t update the model preview. Your saved appearance is unchanged.");
  }
}
