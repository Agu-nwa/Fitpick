export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { createAppearancePreview, appearancePreviewKey, appearancePreviewPromptVersion } from "@/lib/avatar/appearance-preview";
import { hairColorPresetValues, hairStylePresetValues, skinTonePresetValues } from "@/lib/avatar/appearance-presets";
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
  hairStyle: z.enum(hairStylePresetValues),
  hairColor: z.enum(hairColorPresetValues)
}).strict();

function providerFailure(error: unknown) {
  const providerError = error as { status?: unknown; code?: unknown; error?: { code?: unknown } };
  const statusCode = typeof providerError?.status === "number" ? providerError.status : undefined;
  const rawProviderCode = typeof providerError?.code === "string" ? providerError.code : providerError?.error?.code;
  const providerCode = typeof rawProviderCode === "string" ? rawProviderCode.slice(0, 60) : undefined;
  const failureCode = providerCode === "local_missing_api_key" || providerCode === "local_unsupported_image_model"
    ? "setup_required"
    : statusCode === 401 || statusCode === 403
    ? "authentication_failed"
    : statusCode === 429 || providerCode === "insufficient_quota" || providerCode === "billing_hard_limit_reached"
      ? "rate_limited"
      : statusCode && statusCode >= 400 && statusCode < 500
        ? "request_rejected"
        : "provider_error";
  return { statusCode, providerCode, failureCode };
}

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
      { userId: auth.user._id, studioModelGender: input.gender, studioModelType: input.modelType, skinTonePreset: input.skinTone, hairStylePreset: input.hairStyle, hairColorPreset: input.hairColor },
      { $set: { generatedModelImageUrl: generated.url, generatedModelImageStorageKey: generated.storageKey, generatedModelAppearanceKey: key, generatedModelPromptVersion: appearancePreviewPromptVersion, generatedModelAt: new Date() } },
      { new: true }
    );
    if (!profile) return apiError("CONFLICT", "Your appearance changed while the preview was being prepared. Please try again.");
    return apiSuccess({ previewUrl: generated.url, appearanceKey: key, profile: serializeAvatarProfile(profile) });
  } catch (error) {
    const failure = providerFailure(error);
    logSafeError("avatar-profile.appearance-preview", error, {
      failureCode: failure.failureCode,
      providerStatusCode: failure.statusCode,
      providerCode: failure.providerCode
    });
    const message = failure.failureCode === "setup_required"
      ? "Model preview generation is not configured correctly. Your selected appearance was still saved."
      : failure.failureCode === "authentication_failed"
      ? "Model preview generation is not authorized right now. Your selected appearance was still saved."
      : failure.failureCode === "rate_limited"
        ? "Model preview generation is temporarily at capacity. Your selected appearance was still saved; try again shortly."
        : failure.providerCode === "moderation_blocked"
          ? "The model preview image could not be edited safely. Your selected appearance was still saved; choose another Studio Model or try again later."
        : "We couldn’t generate the updated model preview. Your selected appearance was still saved.";
    return apiError(failure.failureCode === "setup_required" ? "SETUP_REQUIRED" : failure.failureCode === "rate_limited" ? "RATE_LIMITED" : "INTERNAL_ERROR", message);
  }
}
