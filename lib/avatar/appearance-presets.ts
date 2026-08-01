export const skinTonePresets = [
  { value: "deep", label: "Deep", swatch: "#3b241b" },
  { value: "dark", label: "Dark", swatch: "#5a3828" },
  { value: "medium-dark", label: "Medium dark", swatch: "#7a4f38" },
  { value: "medium", label: "Medium", swatch: "#a06d4f" },
  { value: "medium-light", label: "Medium light", swatch: "#c99570" },
  { value: "light", label: "Light", swatch: "#e5bea0" },
  { value: "no-preference", label: "No preference", swatch: "linear-gradient(135deg,#3b241b,#e5bea0)" }
] as const;

export const hairColorPresets = [
  { value: "black", label: "Black", swatch: "#171412" },
  { value: "dark-brown", label: "Dark brown", swatch: "#3b261d" },
  { value: "medium-brown", label: "Medium brown", swatch: "#6b4632" },
  { value: "light-brown", label: "Light brown", swatch: "#9a6b48" },
  { value: "blonde", label: "Blonde", swatch: "#d8bd78" },
  { value: "auburn", label: "Auburn", swatch: "#7f3828" },
  { value: "red", label: "Red", swatch: "#a8442f" },
  { value: "gray", label: "Gray", swatch: "#8c8a87" },
  { value: "white", label: "White", swatch: "#eeeae2" },
  { value: "fashion-color", label: "Fashion color", swatch: "linear-gradient(135deg,#6847d9,#d94d91,#39a9a3)" },
  { value: "no-preference", label: "No preference", swatch: "linear-gradient(135deg,#171412,#eeeae2)" }
] as const;

export const hairStylePresets = [
  { value: "short-straight", label: "Short straight", swatch: "#8b735f" },
  { value: "short-wavy", label: "Short wavy", swatch: "#796451" },
  { value: "short-curly", label: "Short curly", swatch: "#685443" },
  { value: "short-coily", label: "Short coily", swatch: "#574538" },
  { value: "buzz-cut", label: "Buzz cut", swatch: "#463a32" },
  { value: "bald", label: "Bald", swatch: "#c99570" },
  { value: "long-straight", label: "Long straight", swatch: "#8b735f" },
  { value: "long-wavy", label: "Long wavy", swatch: "#796451" },
  { value: "long-curly", label: "Long curly", swatch: "#685443" },
  { value: "afro", label: "Afro", swatch: "#574538" },
  { value: "braids", label: "Braids", swatch: "#463a32" },
  { value: "locs", label: "Locs", swatch: "#3d322b" },
  { value: "bun", label: "Bun", swatch: "#796451" },
  { value: "ponytail", label: "Ponytail", swatch: "#685443" },
  { value: "no-preference", label: "No preference", swatch: "linear-gradient(135deg,#463a32,#c99570)" }
] as const;

export type SkinTonePreset = typeof skinTonePresets[number]["value"];
export type HairColorPreset = typeof hairColorPresets[number]["value"];
export type HairStylePreset = typeof hairStylePresets[number]["value"];

export const skinTonePresetValues = skinTonePresets.map((preset) => preset.value) as [SkinTonePreset, ...SkinTonePreset[]];
export const hairColorPresetValues = hairColorPresets.map((preset) => preset.value) as [HairColorPreset, ...HairColorPreset[]];
export const hairStylePresetValues = hairStylePresets.map((preset) => preset.value) as [HairStylePreset, ...HairStylePreset[]];

export function appearancePresetLabel(value: string | null | undefined, presets: ReadonlyArray<{ value: string; label: string }>) {
  return presets.find((preset) => preset.value === value)?.label || "No preference";
}
