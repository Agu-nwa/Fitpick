import { z } from "zod";

export const STUDIO_MODEL_APPEARANCE_VERSION = "studio-model-v1" as const;

export const studioModelGenders = ["female", "male"] as const;
export const studioModelBodyTypes = ["petite", "standard", "athletic", "broad", "curvy", "plus_size", "maternity"] as const;
export const studioModelSkinTones = ["tone_01", "tone_02", "tone_03", "tone_04", "tone_05", "tone_06", "tone_07", "tone_08", "tone_09", "tone_10"] as const;
export const studioModelUndertones = ["cool", "neutral", "warm"] as const;
export const studioModelHairTextures = ["straight", "wavy", "curly", "coily", "kinky_coily", "bald"] as const;
export const studioModelHairLengths = ["shaved", "short", "medium", "long"] as const;
export const studioModelHairColors = ["black", "dark_brown", "medium_brown", "light_brown", "blonde", "auburn", "red", "grey", "white"] as const;
export const studioModelHairStyles = ["bald", "buzz_cut", "close_crop", "short_natural", "afro", "waves", "locs", "braids", "cornrows", "twists", "bob", "pixie", "straight", "wavy", "curly", "ponytail", "bun"] as const;
export const studioModelHeightBands = ["short", "average", "tall"] as const;

export const studioModelAppearanceSchema = z.object({
  version: z.literal(STUDIO_MODEL_APPEARANCE_VERSION),
  representation: z.enum(["studio_model", "personal_digital_twin"]).default("studio_model"),
  gender: z.enum(studioModelGenders),
  bodyType: z.enum(studioModelBodyTypes),
  skinTone: z.enum(studioModelSkinTones),
  undertone: z.enum(studioModelUndertones).optional(),
  hairTexture: z.enum(studioModelHairTextures),
  hairLength: z.enum(studioModelHairLengths),
  hairColor: z.enum(studioModelHairColors),
  hairStyle: z.enum(studioModelHairStyles),
  heightBand: z.enum(studioModelHeightBands).optional()
}).strict().superRefine((value, context) => {
  if (value.hairTexture === "bald" && value.hairStyle !== "bald") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["hairStyle"], message: "Bald texture requires the bald style." });
  }
  if (value.hairStyle === "bald" && value.hairTexture !== "bald") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["hairTexture"], message: "Bald style requires the bald texture." });
  }
  if (value.hairStyle === "buzz_cut" && value.hairLength !== "shaved") {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["hairLength"], message: "A buzz cut uses shaved length." });
  }
});

export type StudioModelAppearance = z.infer<typeof studioModelAppearanceSchema>;

export const appearanceLabels = {
  skinTone: ["Very light", "Light", "Light-medium", "Medium-light", "Medium", "Medium-deep", "Deep medium", "Deep", "Rich deep", "Very deep"],
  bodyType: { petite: "Petite", standard: "Standard", athletic: "Athletic", broad: "Broad", curvy: "Curvy", plus_size: "Plus size", maternity: "Maternity" }
} as const;

export function isBodyTypeAvailableForGender(gender: StudioModelAppearance["gender"], bodyType: StudioModelAppearance["bodyType"]) {
  return gender === "female" ? bodyType !== "broad" : !["curvy", "maternity"].includes(bodyType);
}

