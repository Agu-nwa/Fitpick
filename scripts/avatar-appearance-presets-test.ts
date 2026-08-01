import assert from "node:assert/strict";
import { hairColorPresets, hairColorPresetValues, skinTonePresets, skinTonePresetValues } from "@/lib/avatar/appearance-presets";
import { buildAvatarPromptContext, serializeAvatarProfile } from "@/lib/avatar/avatar-profile";

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

process.stdout.write("Avatar appearance preset regression checks passed.\n");
