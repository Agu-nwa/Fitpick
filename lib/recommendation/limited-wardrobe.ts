import { normalizeOutfitSlot } from "@/lib/recommendation/outfit-slots";

const roleNames: Record<string, string> = { top: "top", bottom: "bottom", onePiece: "one-piece", outerwear: "outer layer", shoes: "footwear", bag: "bag", accessory: "accessory" };

export function buildLimitedWardrobeFallback(input: { items: any[]; missingRoles: string[]; occasion?: string }) {
  const availableRoles = Array.from(new Set((input.items || []).map(normalizeOutfitSlot).filter((role) => role && role !== "unknown")));
  const missingRoles = Array.from(new Set((input.missingRoles || []).map((role) => roleNames[role] || role).filter(Boolean)));
  const occasion = String(input.occasion || "this occasion").trim();
  const formalFootwearMissing = missingRoles.includes("footwear") && /wedding|formal|interview|business|church|dinner/.test(occasion.toLowerCase());
  return {
    status: "limited_wardrobe" as const,
    missingRoles,
    availableRoles,
    occasion,
    messageKey: formalFootwearMissing ? "missing_formal_footwear" : missingRoles.length ? "missing_required_roles" : "no_valid_complete_look",
    message: formalFootwearMissing
      ? `Your closet is nearly there. Add formal footwear to complete this ${occasion.toLowerCase()} look.`
      : `I could not build a complete ${occasion.toLowerCase()} look from the pieces currently available.`
  };
}
