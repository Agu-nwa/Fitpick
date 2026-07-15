export const dynamic = "force-dynamic";

import crypto from "crypto";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getAiModel } from "@/lib/ai/models/registry";
import { errorCategory, logAiEvent } from "@/lib/ai/observability/ai-logger";
import { openai } from "@/lib/ai/openai";
import { buildAvatarPromptContext, getOrCreateAvatarProfile, serializeAvatarProfile } from "@/lib/avatar/avatar-profile";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { rateLimitPlaceholder } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { uploadGeneratedImage } from "@/lib/storage/generated-images";
import { AvatarProfile } from "@/models/AvatarProfile";

const modelImagePromptVersion = "fitpick-tryon-model-v1";

function modelImageCacheKey(userId: string, profile: any) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      userId,
      promptVersion: modelImagePromptVersion,
      genderPresentation: profile.genderPresentation || "neutral",
      bodyPreset: profile.bodyPreset || "average",
      heightPreset: profile.heightPreset || null,
      skinTonePreset: profile.skinTonePreset || null,
      hairStylePreset: profile.hairStylePreset || null,
      posePreset: profile.posePreset || "standing",
      visualizationStyle: profile.visualizationStyle || "luxury"
    }))
    .digest("hex")
    .slice(0, 64);
}

function buildModelPrompt(profile: any) {
  return `Create one clean full-body fashion model reference image for virtual try-on.

Avatar profile:
${buildAvatarPromptContext(profile)}

Requirements:
- Single full-body human model, visible from head to shoes, centered, standing naturally.
- Neutral fitted base outfit only: simple close-fitting top and shorts/leggings that do not hide body shape.
- Plain light studio background, even lighting, no text, no logos, no accessories.
- Preserve the profile's gender presentation, body preset, height impression, skin tone, hair style, and pose preference.
- This is a stable model reference image for later virtual try-on. Do not add fashion styling or extra garments.`;
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitPlaceholder({ key: `avatar-model-image:${meta.ip}`, limit: 4, windowMs: 60 * 1000, operation: "avatar-model-image-generation" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!process.env.OPENAI_API_KEY) return apiError("INTERNAL_ERROR", "Model image generation is not configured yet.");

    const profile = await getOrCreateAvatarProfile(auth.user._id);
    if (!profile.consentAccepted) return apiError("BAD_REQUEST", "Please accept preview consent before creating a model image.");

    const model = getAiModel("imageGeneration");
    const startedAt = Date.now();
    const image = await openai.images.generate({
      model,
      prompt: buildModelPrompt(profile),
      size: "1024x1024"
    });
    const base64 = image.data?.[0]?.b64_json;
    if (!base64) throw new Error("model_image_generation_empty");

    const cacheKey = modelImageCacheKey(String(auth.user._id), profile);
    const uploaded = await uploadGeneratedImage(base64, {
      userId: String(auth.user._id),
      outfitId: "avatar-model",
      cacheKey,
      storageKey: `avatar-models/${String(auth.user._id)}/${cacheKey}.png`,
      contentType: "image/png",
      format: "png",
      width: 1024,
      height: 1024
    });

    const updated = await AvatarProfile.findOneAndUpdate(
      { userId: auth.user._id },
      {
        $set: {
          tryOnModelSource: "generated",
          generatedModelImageUrl: uploaded.url,
          generatedModelImageStorageKey: uploaded.storageKey,
          generatedModelPromptVersion: modelImagePromptVersion,
          generatedModelAt: new Date()
        }
      },
      { new: true, setDefaultsOnInsert: true }
    );

    logAiEvent({
      operation: "avatar-model-image-generate",
      model,
      latencyMs: Date.now() - startedAt,
      status: "success",
      cacheHit: false,
      provider: "openai"
    });

    return apiSuccess({ profile: serializeAvatarProfile(updated) }, { message: "Model image created." });
  } catch (error) {
    logAiEvent({
      operation: "avatar-model-image-generate",
      model: getAiModel("imageGeneration"),
      latencyMs: 0,
      status: "failed",
      cacheHit: false,
      provider: "openai",
      errorCategory: errorCategory(error)
    });
    logSafeError("avatar-profile.model-image.generate", error);
    return apiError("INTERNAL_ERROR", "Unable to create your model image right now.");
  }
}
