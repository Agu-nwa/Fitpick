import crypto from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { toFile } from "openai";
import { getAiModel } from "@/lib/ai/models/registry";
import { openai } from "@/lib/ai/openai";
import { appearancePresetLabel, hairColorPresets, hairStylePresets, skinTonePresets, type HairColorPreset, type HairStylePreset, type SkinTonePreset } from "@/lib/avatar/appearance-presets";
import { resolveStudioModelImagePath, type StudioModelGender, type StudioModelType } from "@/lib/avatar/studio-models";
import { uploadGeneratedImage } from "@/lib/storage/generated-images";

export const appearancePreviewPromptVersion = "studio-appearance-v4-safe-clothing";

const skinTonePrompts: Partial<Record<SkinTonePreset, string>> = {
  deep: "a deep neutral-brown skin tone with natural warm undertones",
  dark: "a dark rich-brown skin tone with balanced neutral undertones",
  "medium-dark": "a medium-deep brown skin tone with warm golden undertones",
  medium: "a medium tan-brown skin tone with balanced golden undertones",
  "medium-light": "a light-medium beige-brown skin tone with warm undertones",
  light: "a light beige skin tone with soft neutral undertones"
};

const hairColorPrompts: Partial<Record<HairColorPreset, string>> = {
  black: "natural soft-black hair",
  "dark-brown": "natural dark-brown hair",
  "medium-brown": "natural medium-brown hair",
  "light-brown": "natural light-brown hair",
  blonde: "natural warm-blonde hair",
  auburn: "natural auburn-brown hair",
  red: "natural copper-red hair",
  gray: "natural salt-and-pepper gray hair",
  white: "natural silver-white hair",
  "fashion-color": "a tasteful saturated fashion hair color while preserving realistic roots, highlights, and shadows"
};

function supportsAppearanceEditing(model: string) {
  return /^gpt-image-(?:1(?:\.5)?|2)(?:$|-)/i.test(model) || /^chatgpt-image-/i.test(model);
}

function configurationError(code: string) {
  return Object.assign(new Error("appearance_preview_not_configured"), { code });
}

export function appearancePreviewKey(input: { gender: StudioModelGender; modelType: StudioModelType; skinTone: SkinTonePreset; hairStyle: HairStylePreset; hairColor: HairColorPreset }) {
  return crypto.createHash("sha256").update(JSON.stringify({ ...input, version: appearancePreviewPromptVersion })).digest("hex");
}

export async function createAppearancePreview(userId: string, input: { gender: StudioModelGender; modelType: StudioModelType; skinTone: SkinTonePreset; hairStyle: HairStylePreset; hairColor: HairColorPreset }) {
  if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_ADMIN_KEY) throw configurationError("local_missing_api_key");
  const model = getAiModel("imageGeneration");
  if (!supportsAppearanceEditing(model)) throw configurationError("local_unsupported_image_model");
  const imagePath = resolveStudioModelImagePath(input.gender, input.modelType);
  if (!imagePath) throw new Error("invalid_studio_model_selection");
  const source = await readFile(path.join(process.cwd(), "public", imagePath.replace(/^\//, "")));
  const key = appearancePreviewKey(input);
  const skin = input.skinTone === "no-preference" ? "Preserve the source skin tone exactly." : `Change the visible skin tone to ${skinTonePrompts[input.skinTone] || appearancePresetLabel(input.skinTone, skinTonePresets)}.`;
  const hairStyle = input.hairStyle === "no-preference" ? "Preserve the source hairstyle exactly." : `Change the hairstyle to ${appearancePresetLabel(input.hairStyle, hairStylePresets)}, keeping a natural hairline and realistic texture.`;
  const hair = input.hairColor === "no-preference" ? "Preserve the source hair color exactly." : `Change the hair color to ${hairColorPrompts[input.hairColor] || appearancePresetLabel(input.hairColor, hairColorPresets)}.`;
  const prompt = `Edit this fictional adult digital studio model used for a fashion fitting application.

${skin}
${hairStyle}
${hair}

Preserve the facial identity and structure, body shape and proportions, pose, clothing and clothing color, framing, lighting, shadows, studio background, and camera angle. Except for the selected hairstyle, preserve all anatomy and facial features. Keep natural realistic skin shading across every visible area and realistic hair roots, highlights, and shadows. Change only the requested visible appearance attributes. Do not add or remove garments, accessories, text, or objects. Produce a photorealistic full-body fashion studio image.`;
  const result = await openai.images.edit({
    model,
    image: await toFile(source, "studio-model.png", { type: "image/png" }),
    prompt,
    size: "1024x1536",
    quality: "high",
    output_format: "png",
    input_fidelity: "high"
  }, { timeout: 120_000 });
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
    height: 1536
  });
  return { ...uploaded, appearanceKey: key };
}
