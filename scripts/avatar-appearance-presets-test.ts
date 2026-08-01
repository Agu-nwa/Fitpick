import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { hairColorPresets, hairColorPresetValues, hairStylePresets, hairStylePresetValues, skinTonePresets, skinTonePresetValues } from "@/lib/avatar/appearance-presets";
import { buildAvatarPromptContext, preferredTryOnModelImageUrl, serializeAvatarProfile } from "@/lib/avatar/avatar-profile";
import { appearancePreviewKey } from "@/lib/avatar/appearance-preview";

assert.equal(new Set(skinTonePresetValues).size, skinTonePresets.length, "Skin-tone preset values must be unique.");
assert.equal(new Set(hairColorPresetValues).size, hairColorPresets.length, "Hair-color preset values must be unique.");
assert.equal(new Set(hairStylePresetValues).size, hairStylePresets.length, "Hair-style preset values must be unique.");
assert.ok(skinTonePresetValues.includes("no-preference"), "Skin-tone presets must support no preference.");
assert.ok(hairColorPresetValues.includes("no-preference"), "Hair-color presets must support no preference.");
assert.ok(hairStylePresetValues.includes("no-preference"), "Hair-style presets must support no preference.");

const context = buildAvatarPromptContext({
  genderPresentation: "feminine",
  bodyPreset: "average",
  skinTonePreset: "deep",
  hairStylePreset: "locs",
  hairColorPreset: "auburn"
});
assert.match(context, /Skin tone preset: deep/);
assert.match(context, /Hair color preset: auburn/);
assert.match(context, /Hair style preset: locs/);

const noPreferenceContext = buildAvatarPromptContext({
  genderPresentation: "neutral",
  skinTonePreset: "no-preference",
  hairStylePreset: "no-preference",
  hairColorPreset: "no-preference"
});
assert.doesNotMatch(noPreferenceContext, /Hair color preset/);

const serialized = serializeAvatarProfile({
  _id: "000000000000000000000001",
  skinTonePreset: "medium-dark",
  hairStylePreset: "short-curly",
  hairColorPreset: "black"
});
assert.equal(serialized.skinTonePreset, "medium-dark");
assert.equal(serialized.hairColorPreset, "black");
assert.equal(serialized.hairStylePreset, "short-curly");
assert.equal(serialized.generatedModelAppearanceKey, "");

const firstKey = appearancePreviewKey({ gender: "female", modelType: "standard", skinTone: "deep", hairStyle: "short-curly", hairColor: "black" });
const sameKey = appearancePreviewKey({ gender: "female", modelType: "standard", skinTone: "deep", hairStyle: "short-curly", hairColor: "black" });
const changedHairKey = appearancePreviewKey({ gender: "female", modelType: "standard", skinTone: "deep", hairStyle: "short-curly", hairColor: "auburn" });
const changedStyleKey = appearancePreviewKey({ gender: "female", modelType: "standard", skinTone: "deep", hairStyle: "locs", hairColor: "black" });
const changedBodyKey = appearancePreviewKey({ gender: "female", modelType: "curvy", skinTone: "deep", hairStyle: "short-curly", hairColor: "black" });
assert.equal(firstKey, sameKey, "Identical appearance requests must share a cache key.");
assert.notEqual(firstKey, changedHairKey, "Hair color must participate in the appearance cache key.");
assert.notEqual(firstKey, changedStyleKey, "Hair style must participate in the appearance cache key.");
assert.notEqual(firstKey, changedBodyKey, "Body shape must participate in the appearance cache key.");
assert.equal(preferredTryOnModelImageUrl({
  studioModelGender: "female",
  studioModelType: "standard",
  skinTonePreset: "deep",
  hairStylePreset: "short-curly",
  hairColorPreset: "black",
  generatedModelAppearanceKey: firstKey,
  generatedModelImageUrl: "https://cdn.example.com/selected-appearance.png"
}), "https://cdn.example.com/selected-appearance.png", "Try-on must prefer the generated image matching the current selected appearance.");
assert.notEqual(preferredTryOnModelImageUrl({
  studioModelGender: "female",
  studioModelType: "curvy",
  skinTonePreset: "deep",
  hairStylePreset: "short-curly",
  hairColorPreset: "black",
  generatedModelAppearanceKey: firstKey,
  generatedModelImageUrl: "https://cdn.example.com/stale-appearance.png"
}), "https://cdn.example.com/stale-appearance.png", "Try-on must reject a generated image belonging to another body model.");

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const form = source("components/avatar/AvatarProfileForm.tsx");
assert.match(form, /setSkinTonePreset/, "Skin tone selection must update local state immediately.");
assert.match(form, /setHairColorPreset/, "Hair color selection must update local state immediately.");
assert.match(form, /setHairStylePreset/, "Hair style selection must update local state immediately.");
assert.match(form, /window\.setTimeout\([\s\S]*650/, "Appearance persistence must be debounced.");
assert.match(form, /appearanceRequest\.current/, "Rapid selections must use a latest-request guard.");
assert.match(form, /controller\.abort\(\)/, "Superseded preview requests must be cancelled.");
assert.match(form, /previewUrl \|\| currentModel\.imagePath/, "The existing preview must remain visible while updating or after failure.");
assert.match(form, /safeUserMessage\(generated\.error/, "Preview failures must show the server's safe actionable message.");
assert.match(form, /aria-live="polite"/, "Appearance status must be announced accessibly.");
assert.match(source("components/avatar/AppearancePresetPicker.tsx"), /aria-pressed=\{selected\}/, "Swatches must expose their selected state.");
assert.match(source("components/layout/AppShell.tsx"), /pb-\[calc\(10rem\+var\(--safe-bottom\)\)\]/, "Mobile content must clear the bottom navigation and safe area.");
const previewPipeline = source("lib/avatar/avatar-preview.ts");
assert.match(previewPipeline, /skinTonePreset/, "Virtual try-on cache/prompt inputs must include skin tone.");
assert.match(previewPipeline, /hairColorPreset/, "Virtual try-on cache/prompt inputs must include hair color.");
assert.match(previewPipeline, /image: \[selectedModelReference!/, "Internal try-on must attach the selected model as its first image reference.");
assert.match(previewPipeline, /mandatory person\/model reference/, "The try-on prompt must prohibit replacing the selected model.");
const appearancePipeline = source("lib/avatar/appearance-preview.ts");
assert.match(appearancePipeline, /size: "1024x1536"/, "Appearance previews must preserve a portrait full-body frame.");
assert.match(appearancePipeline, /quality: "high"/, "Appearance edits must request high quality.");
assert.match(appearancePipeline, /supportsAppearanceEditing/, "Appearance edits must reject incompatible image models safely.");
assert.match(appearancePipeline, /providerCode\(error\) !== "moderation_blocked"/, "Moderation-blocked edits must use the safe fictional-avatar fallback.");
assert.match(appearancePipeline, /openai\.images\.generate/, "The appearance pipeline must support generation when a provider refuses person editing.");
assert.match(appearancePipeline, /generated-previews\/\$\{userId\}\/my-model\//, "Appearance previews must use the IAM-approved generated-previews S3 prefix.");
const studioModels = source("lib/avatar/studio-models.ts");
assert.equal((studioModels.match(/-safe-v2\.png/g) || []).length, 11, "Every Studio Model category must use a safe-clothing source asset.");

process.stdout.write("Avatar appearance preset regression checks passed.\n");
