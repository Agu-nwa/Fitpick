import { validateAccessoryRoles } from "@/lib/recommendation/accessory-completion";
import { evaluateOutfitCompleteness } from "@/lib/recommendation/completeness";
import { normalizeOutfitSlot, sanitizeOutfitItems } from "@/lib/recommendation/outfit-slots";
import { type OccasionProfile } from "@/lib/recommendation/occasion-profiles";
import { type OutfitTemplate } from "@/lib/recommendation/outfit-templates";

export type CandidateValidationResult = {
  valid: boolean;
  hardFailure: boolean;
  rejectReason: string;
  rejectionReasons: string[];
  warnings: string[];
  structure: {
    coreGarments: string[];
    layer: string[];
    footwear: string[];
    bag: string[];
    womensHair: string[];
    watch: string[];
    jewelry: string[];
    eyewear: string[];
    headwear: string[];
  };
};

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function text(item: any) {
  return [item?.name, item?.category, item?.subcategory, item?.garmentType].filter(Boolean).join(" ").toLowerCase();
}

function idsFor(items: any[], predicate: (item: any) => boolean) {
  return items.filter(predicate).map(itemId).filter(Boolean);
}

function structureFor(items: any[]) {
  return {
    coreGarments: idsFor(items, (item) => ["top", "bottom", "onePiece"].includes(normalizeOutfitSlot(item))),
    layer: idsFor(items, (item) => normalizeOutfitSlot(item) === "outerwear"),
    footwear: idsFor(items, (item) => normalizeOutfitSlot(item) === "shoes"),
    bag: idsFor(items, (item) => normalizeOutfitSlot(item) === "bag"),
    womensHair: idsFor(items, (item) => item.category === "womens_hair" || /\b(wig|braid|hair)\b/.test(text(item))),
    watch: idsFor(items, (item) => /\b(watch|smartwatch)\b/.test(text(item))),
    jewelry: idsFor(items, (item) => /\b(necklace|bracelet|bangle|chain|jewel)\b/.test(text(item))),
    eyewear: idsFor(items, (item) => /\b(sunglasses|eyewear|glasses|shades)\b/.test(text(item))),
    headwear: idsFor(items, (item) => /\b(hat|cap|headwear|headwrap)\b/.test(text(item)))
  };
}

export function validateRecommendationCandidate(input: {
  items: any[];
  template?: OutfitTemplate;
  profile?: OccasionProfile;
  weatherContext?: string;
  allowIncomplete?: boolean;
}): CandidateValidationResult {
  const sanitized = sanitizeOutfitItems(input.items || []);
  const items = sanitized.items;
  const warnings: string[] = [];
  const rejectionReasons: string[] = [];
  const completeness = evaluateOutfitCompleteness(items, { allowedStructures: input.template?.validStructures });
  const accessoryValidation = validateAccessoryRoles(items);
  const structure = structureFor(items);

  if (sanitized.removed.length) warnings.push("duplicate_slot_removed");
  if (!accessoryValidation.valid) warnings.push("accessory_role_limit_exceeded");
  if (input.template?.requiredCategories.includes("shoes") && !structure.footwear.length) warnings.push("missing_footwear");
  if (input.template?.requiredCategories.includes("dresses") && !items.some((item) => item.category === "dresses")) {
    const hasTopBottom = structure.coreGarments.length >= 2;
    if (!hasTopBottom) warnings.push("missing_main_garment");
  }
  const formalContext = input.profile?.formality === "formal";
  const formalCasualConflict = formalContext && items.some((item) => /\b(cap|hoodie|backpack|trainers?|athletic sneakers?|gym|sportswear|sleepwear|swimwear|denim shorts?|cargo shorts?|distressed|beachwear|slides?)\b/.test(text(item)));
  if (formalCasualConflict) {
    warnings.push("formal_context_casual_item");
    rejectionReasons.push("occasion_forbidden_subtype");
  }

  const athleticFootwearForFormalEvent = formalContext && items.some((item) => normalizeOutfitSlot(item) === "shoes" && /\b(athletic|running|gym|sport|trainer|sneaker)\b/.test(text(item)));
  if (athleticFootwearForFormalEvent) rejectionReasons.push("athletic_footwear_for_formal_event");
  const weather = String(input.weatherContext || "").toLowerCase();
  const weatherConflict = /rain|storm|cold|snow/.test(weather) && items.some((item) => normalizeOutfitSlot(item) === "shoes" && /\b(slide|open toe|sandal)\b/.test(text(item)));
  if (weatherConflict) rejectionReasons.push("weather_conflict");

  const missingCore = completeness.completenessStatus === "missing_core_item";
  const missingFootwear = completeness.completenessStatus === "missing_footwear";
  if (missingCore) rejectionReasons.push("missing_core_item");
  if (missingFootwear) rejectionReasons.push("missing_footwear");
  if (!accessoryValidation.valid) rejectionReasons.push("accessory_role_limit_exceeded");
  if (sanitized.removed.some((entry) => entry.reason === "duplicate_outfit_slot")) rejectionReasons.push("exclusive_role_conflict");
  const hardFailure = formalCasualConflict || athleticFootwearForFormalEvent || weatherConflict || !accessoryValidation.valid || sanitized.removed.some((entry) => entry.reason === "duplicate_outfit_slot");
  const valid =
    Boolean(items.length) &&
    accessoryValidation.valid &&
    !hardFailure &&
    !sanitized.removed.some((entry) => entry.reason === "duplicate_outfit_slot") &&
    (input.allowIncomplete || (!missingCore && !missingFootwear));

  return {
    valid,
    hardFailure,
    rejectReason: valid ? "" : rejectionReasons[0] || "styling_validation_failed",
    rejectionReasons: Array.from(new Set(rejectionReasons)),
    warnings,
    structure
  };
}
