export type OccasionGroup =
  | "everyday"
  | "work"
  | "formal"
  | "social"
  | "event"
  | "weather"
  | "travel";

export function inferOccasionGroup(input: { name?: string; group?: string; weatherContext?: string }) {
  const name = `${input.name || ""} ${input.group || ""} ${input.weatherContext || ""}`.toLowerCase();
  if (/(wedding|ceremony|celebration|party|graduation|birthday|gala|red carpet|event)/.test(name)) return "event";
  if (/(church|wedding)/.test(name)) return "formal";
  if (/(rain|hot|cold|weather|wind|snow|humid)/.test(name)) return "weather";
  if (/(travel|vacation|airport|beach|resort)/.test(name)) return "travel";
  if (/(work|office|meeting|business casual|business)/.test(name)) return "work";
  if (/(formal|interview|gala|black tie)/.test(name)) return "formal";
  if (/(date|date night|dinner|hangout|social|smart casual)/.test(name)) return "social";
  if (/(streetwear|weekend|casual)/.test(name)) return "everyday";
  return "everyday";
}

export function structureFor(group: OccasionGroup) {
  switch (group) {
    case "work":
      return ["tops", "bottoms", "shoes", "outerwear", "bags", "accessories"];
    case "formal":
      return ["dresses", "tops", "bottoms", "shoes", "outerwear", "bags", "accessories"];
    case "event":
      return ["dresses", "tops", "bottoms", "shoes", "outerwear", "bags", "accessories"];
    case "weather":
      return ["tops", "bottoms", "shoes", "outerwear", "bags", "accessories"];
    case "travel":
      return ["tops", "bottoms", "shoes", "bags", "outerwear", "accessories"];
    default:
      return ["tops", "bottoms", "shoes", "bags", "accessories"];
  }
}

export function missingCoreCategories(items: any[], desiredCategories: string[]) {
  const slots = new Set(items.flatMap((item) => outfitSlotsForItem(item)));
  const missing: string[] = [];
  const wantsCore = desiredCategories.some((category) => ["tops", "bottoms", "dresses", "native"].includes(category));
  const hasAlternativeCore = slots.has("onePiece") || (slots.has("top") && slots.has("bottom"));
  if (wantsCore && !hasAlternativeCore) missing.push("complete core outfit");
  if (desiredCategories.includes("shoes") && !slots.has("shoes")) missing.push("shoes");
  return missing;
}

import { outfitSlotsForItem } from "@/lib/recommendation/outfit-slots";
