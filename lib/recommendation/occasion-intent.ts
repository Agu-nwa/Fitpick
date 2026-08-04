import { resolveOccasionProfile, type OccasionProfileId } from "@/lib/recommendation/occasion-profiles";

export type CanonicalOccasionIntent = {
  id: OccasionProfileId;
  label: string;
  detected: boolean;
};

export type StylistRequestIntent = {
  requestText: string;
  occasion: CanonicalOccasionIntent;
  styleDirections: Array<"simple" | "polished" | "bold" | "statement" | "weather-safe" | "comfortable" | "different">;
};

const explicitSignals = /\b(business|work|office|meeting|corporate|interview|wedding|aso[-\s]?ebi|formal|gala|black tie|ceremony|church|sunday|vacation|holiday|resort|beach|airport|flight|travel|gym|workout|training|sport|networking|conference|professional|date|romantic|birthday|party|celebration|dinner|evening|smart casual|polished casual|traditional|native|cultural|agbada|kaftan|isiagu|ankara|casual|weekend|today|everyday|streetwear|off[-\s]?duty)\b/i;

export function resolveCanonicalOccasionIntent(value: unknown): CanonicalOccasionIntent {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 400) : "";
  const detected = explicitSignals.test(text);
  const profile = resolveOccasionProfile({ occasionName: detected ? text : "everyday" });
  return {
    id: profile.id,
    label: profile.id === "wedding" ? "Wedding Guest" : profile.label,
    detected
  };
}

export function parseStylistRequestIntent(value: unknown): StylistRequestIntent {
  const requestText = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 800) : "";
  const directionPatterns: Array<[StylistRequestIntent["styleDirections"][number], RegExp]> = [
    ["simple", /\b(simple|minimal|understated)\b/i],
    ["polished", /\b(polished|elevated|refined)\b/i],
    ["bold", /\b(bold|colourful|colorful)\b/i],
    ["statement", /\b(statement|dramatic)\b/i],
    ["weather-safe", /\b(weather[-\s]?safe|rain[-\s]?ready)\b/i],
    ["comfortable", /\b(comfortable|comfy|comfort)\b/i],
    ["different", /\b(fresh|different|another|alternative|regenerate|new\s+(?:look|outfit))\b/i]
  ];
  return {
    requestText,
    occasion: resolveCanonicalOccasionIntent(requestText),
    styleDirections: directionPatterns.filter(([, pattern]) => pattern.test(requestText)).map(([direction]) => direction)
  };
}
