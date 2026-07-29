import { colorCompatibilityScore } from "@/lib/recommendation/color";
import { accessoryRoleFor, isAccessoryCandidate } from "@/lib/recommendation/accessory-completion";
import { fabricCompatibilityScore, materialWeatherScore, metadataValue } from "@/lib/recommendation/scoring";

function text(items: any[]) {
  return items.map((item) => [
    item.name,
    item.category,
    item.subcategory,
    item.fabric,
    item.fit,
    item.pattern,
    metadataValue(item, "garmentType"),
    metadataValue(item, "fabricEstimate")
  ].filter(Boolean).join(" ")).join(" ").toLowerCase();
}

export function fashionKnowledgeScore(items: any[], input: {
  occasionName?: string;
  weatherContext?: string;
  occasionProfile?: any;
} = {}) {
  const copy = text(items);
  const occasion = String(input.occasionName || "").toLowerCase();
  const weather = String(input.weatherContext || "").toLowerCase();
  let score = 0;

  if (/business|interview|office|networking/.test(occasion)) {
    if (/\b(shirt|blazer|trouser|loafer|formal shoe|watch|belt|briefcase|tote)\b/.test(copy)) score += 14;
    if (/\b(cap|slides|flip flop|sports short)\b/.test(copy)) score -= 16;
  }
  if (/wedding|formal|gala|church/.test(occasion)) {
    if (/\b(formal|dress|gown|native|agbada|kaftan|isiagu|heel|loafer|watch|clutch)\b/.test(copy)) score += 14;
    if (/\b(hoodie|trainer|backpack|cap)\b/.test(copy)) score -= 12;
  }
  if (/vacation|travel|airport/.test(occasion)) {
    if (/\b(linen|cotton|light|sneaker|sandal|crossbody|tote|backpack)\b/.test(copy)) score += 10;
  }
  if (/rain|storm|drizzle/.test(weather) && /\b(suede|silk|chiffon)\b/.test(copy)) score -= 10;
  if (/hot|humid|summer/.test(weather) && /\b(wool|fleece|heavy|thick)\b/.test(copy)) score -= 12;
  if (/cold|winter|wind/.test(weather) && /\b(wool|knit|leather|coat|jacket|fleece)\b/.test(copy)) score += 10;

  const accessoryRoles = new Set(items.filter(isAccessoryCandidate).map(accessoryRoleFor));
  if (accessoryRoles.has("carry")) score += 4;
  if (accessoryRoles.has("wrist")) score += 3;
  if (accessoryRoles.has("waist") && /business|formal|interview|church/.test(occasion)) score += 4;
  if (accessoryRoles.has("head") && /formal|interview|business/.test(occasion)) score -= 6;

  score += Math.round(colorCompatibilityScore(items) * 0.25);
  score += Math.round(fabricCompatibilityScore(items) * 0.35);
  score += Math.round(materialWeatherScore(items, input.weatherContext) * 0.45);
  return Math.max(-40, Math.min(48, score));
}

export function marketplaceExtensionPoints(items: any[], input: { missingCategories?: string[] } = {}) {
  const missing = new Set(input.missingCategories || []);
  const present = new Set(items.map((item) => item.category));
  const suggestions: string[] = [];
  if (missing.has("shoes") || !present.has("shoes")) suggestions.push("footwear");
  if (!present.has("bags")) suggestions.push("bag");
  if (!items.some(isAccessoryCandidate)) suggestions.push("accessory");
  return suggestions.slice(0, 4);
}
