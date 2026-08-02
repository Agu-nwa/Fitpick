import crypto from "crypto";
import { studioModelAppearanceSchema, type StudioModelAppearance } from "./appearance-taxonomy";

export function parseStudioModelAppearance(value: unknown) {
  const plain = value && typeof (value as { toObject?: unknown }).toObject === "function"
    ? (value as { toObject(): unknown }).toObject()
    : value;

  if (!plain || typeof plain !== "object" || Array.isArray(plain)) {
    return studioModelAppearanceSchema.parse(plain);
  }

  const normalized = { ...(plain as Record<string, unknown>) };
  // Mongoose persists optional nested fields as null, while the API/domain
  // schema represents an omitted selection as undefined.
  if (normalized.undertone == null) delete normalized.undertone;
  if (normalized.heightBand == null) delete normalized.heightBand;
  delete normalized._id;

  return studioModelAppearanceSchema.parse(normalized);
}

export function studioModelAppearanceKey(value: StudioModelAppearance) {
  const parsed = parseStudioModelAppearance(value);
  const canonical = [parsed.version, parsed.representation, parsed.gender, parsed.bodyType, parsed.skinTone, parsed.undertone || "none", parsed.hairTexture, parsed.hairLength, parsed.hairColor, parsed.hairStyle, parsed.heightBand || "none"].join("|");
  return `sm_${crypto.createHash("sha256").update(canonical).digest("hex").slice(0, 24)}`;
}

export function buildStudioModelPrompt(value: StudioModelAppearance) {
  const a = parseStudioModelAppearance(value);
  return [
    "Create a fictional adult fashion studio model, full body, front-facing, neutral standing pose.",
    `Presentation: ${a.gender}; body type: ${a.bodyType.replaceAll("_", " ")}; skin tone reference: ${a.skinTone.replace("_", " ")}${a.undertone ? ` with ${a.undertone} undertone` : ""}.`,
    `Hair: ${a.hairColor.replaceAll("_", " ")} ${a.hairStyle.replaceAll("_", " ")}, ${a.hairTexture.replaceAll("_", " ")} texture, ${a.hairLength} length.`,
    a.heightBand ? `Height presentation: ${a.heightBand}.` : "",
    "Ordinary fitted crew-neck shirt, full-length neutral trousers, plain trainers; no underwear, swimwear, logos, text, jewelry, or sexualized styling.",
    "Even studio lighting, plain warm-white background, realistic proportions, entire body and footwear visible. Do not imitate a real person or infer identity attributes beyond the supplied appearance controls."
  ].filter(Boolean).join(" ");
}

export function legacySelectionForAppearance(value: StudioModelAppearance) {
  const a = parseStudioModelAppearance(value);
  const bodyType = a.bodyType === "plus_size" ? "plus-size" : a.bodyType;
  return { studioModelGender: a.gender, studioModelType: bodyType } as const;
}
