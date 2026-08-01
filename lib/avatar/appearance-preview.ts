import crypto from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { toFile } from "openai";
import { getAiModel } from "@/lib/ai/models/registry";
import { openai } from "@/lib/ai/openai";
import { appearancePresetLabel, hairColorPresets, skinTonePresets, type HairColorPreset, type SkinTonePreset } from "@/lib/avatar/appearance-presets";
import { resolveStudioModelImagePath, type StudioModelGender, type StudioModelType } from "@/lib/avatar/studio-models";
import { uploadGeneratedImage } from "@/lib/storage/generated-images";

export const appearancePreviewPromptVersion = "studio-appearance-v1";

export function appearancePreviewKey(input: { gender: StudioModelGender; modelType: StudioModelType; skinTone: SkinTonePreset; hairColor: HairColorPreset }) {
  return crypto.createHash("sha256").update(JSON.stringify({ ...input, version: appearancePreviewPromptVersion })).digest("hex");
}

export async function createAppearancePreview(userId: string, input: { gender: StudioModelGender; modelType: StudioModelType; skinTone: SkinTonePreset; hairColor: HairColorPreset }) {
  const imagePath = resolveStudioModelImagePath(input.gender, input.modelType);
  if (!imagePath) throw new Error("invalid_studio_model_selection");
  const source = await readFile(path.join(process.cwd(), "public", imagePath.replace(/^\//, "")));
  const key = appearancePreviewKey(input);
  const skin = input.skinTone === "no-preference" ? "preserve the source skin tone" : `set skin tone to ${appearancePresetLabel(input.skinTone, skinTonePresets)}`;
  const hair = input.hairColor === "no-preference" ? "preserve the source hair color" : `set hair color to ${appearancePresetLabel(input.hairColor, hairColorPresets)}`;
  const prompt = `Edit only the visible model's appearance: ${skin}; ${hair}. Preserve the exact person position, body shape, proportions, pose, facial structure, hairstyle, clothing, framing, lighting, background, and camera angle. Do not add or remove garments, accessories, text, or objects. Produce a photorealistic full-body fashion studio image.`;
  const result = await openai.images.edit({
    model: getAiModel("imageGeneration"),
    image: await toFile(source, "studio-model.png", { type: "image/png" }),
    prompt,
    size: "1024x1024",
    input_fidelity: "high"
  });
  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("appearance_preview_empty");
  const uploaded = await uploadGeneratedImage(base64, {
    userId,
    outfitId: "my-model",
    cacheKey: key,
    storageKey: `model-appearance/${userId}/${key}.png`,
    contentType: "image/png",
    format: "png",
    width: 1024,
    height: 1024
  });
  return { ...uploaded, appearanceKey: key };
}
