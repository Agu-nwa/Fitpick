import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { hairColorPresets, hairColorPresetValues, skinTonePresets, skinTonePresetValues } from "@/lib/avatar/appearance-presets";
import { buildAvatarPromptContext, preferredTryOnModelImageUrl, serializeAvatarProfile } from "@/lib/avatar/avatar-profile";
import { appearancePreviewKey } from "@/lib/avatar/appearance-preview";

assert.equal(new Set(skinTonePresetValues).size, skinTonePresets.length, "Skin-tone preset values must be unique.");
assert.equal(new Set(hairColorPresetValues).size, hairColorPresets.length, "Hair-color preset values must be unique.");
assert.ok(skinTonePresetValues.includes("no-preference"), "Skin-tone presets must support no preference.");
assert.ok(hairColorPresetValues.includes("no-preference"), "Hair-color presets must support no preference.");

const context = buildAvatarPromptContext({
  genderPresentation: "feminine",
  bodyPreset: "average",
  skinTonePreset: "deep",
  hairColorPreset: "auburn"
});
assert.match(context, /Skin tone preset: deep/);
assert.match(context, /Hair color preset: auburn/);

const noPreferenceContext = buildAvatarPromptContext({
  genderPresentation: "neutral",
  skinTonePreset: "no-preference",
  hairColorPreset: "no-preference"
});
assert.doesNotMatch(noPreferenceContext, /Hair color preset/);

const serialized = serializeAvatarProfile({
  _id: "000000000000000000000001",
  skinTonePreset: "medium-dark",
  hairColorPreset: "black"
});
assert.equal(serialized.skinTonePreset, "medium-dark");
assert.equal(serialized.hairColorPreset, "black");
assert.equal(serialized.generatedModelAppearanceKey, "");

const firstKey = appearancePreviewKey({ gender: "female", modelType: "standard", skinTone: "deep", hairColor: "black" });
const sameKey = appearancePreviewKey({ gender: "female", modelType: "standard", skinTone: "deep", hairColor: "black" });
const changedHairKey = appearancePreviewKey({ gender: "female", modelType: "standard", skinTone: "deep", hairColor: "auburn" });
const changedBodyKey = appearancePreviewKey({ gender: "female", modelType: "curvy", skinTone: "deep", hairColor: "black" });
assert.equal(firstKey, sameKey, "Identical appearance requests must share a cache key.");
assert.notEqual(firstKey, changedHairKey, "Hair color must participate in the appearance cache key.");
assert.notEqual(firstKey, changedBodyKey, "Body shape must participate in the appearance cache key.");
assert.equal(preferredTryOnModelImageUrl({
  studioModelGender: "female",
  studioModelType: "standard",
  skinTonePreset: "deep",
  hairColorPreset: "black",
  generatedModelAppearanceKey: firstKey,
  generatedModelImageUrl: "https://cdn.example.com/selected-appearance.png"
}), "https://cdn.example.com/selected-appearance.png", "Try-on must prefer the generated image matching the current selected appearance.");
assert.notEqual(preferredTryOnModelImageUrl({
  studioModelGender: "female",
  studioModelType: "curvy",
  skinTonePreset: "deep",
  hairColorPreset: "black",
  generatedModelAppearanceKey: firstKey,
  generatedModelImageUrl: "https://cdn.example.com/stale-appearance.png"
}), "https://cdn.example.com/stale-appearance.png", "Try-on must reject a generated image belonging to another body model.");

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const form = source("components/avatar/AvatarProfileForm.tsx");
assert.match(form, /setSkinTonePreset/, "Skin tone selection must update local state immediately.");
assert.match(form, /setHairColorPreset/, "Hair color selection must update local state immediately.");
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

process.stdout.write("Avatar appearance preset regression checks passed.\n");
