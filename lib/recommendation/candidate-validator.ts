import { validateAccessoryRoles } from "@/lib/recommendation/accessory-completion";
import { evaluateOutfitCompleteness } from "@/lib/recommendation/completeness";
import { normalizeOutfitSlot, sanitizeOutfitItems } from "@/lib/recommendation/outfit-slots";
import { type OccasionProfile } from "@/lib/recommendation/occasion-profiles";
import { type OutfitTemplate } from "@/lib/recommendation/outfit-templates";

export type CandidateValidationResult = {
  valid: boolean;
  rejectReason: string;
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
  allowIncomplete?: boolean;
}): CandidateValidationResult {
  const sanitized = sanitizeOutfitItems(input.items || []);
  const items = sanitized.items;
  const warnings: string[] = [];
  const completeness = evaluateOutfitCompleteness(items);
  const accessoryValidation = validateAccessoryRoles(items);
  const structure = structureFor(items);

  if (sanitized.removed.length) warnings.push("duplicate_slot_removed");
  if (!accessoryValidation.valid) warnings.push("accessory_role_limit_exceeded");
  if (input.template?.requiredCategories.includes("shoes") && !structure.footwear.length) warnings.push("missing_footwear");
  if (input.template?.requiredCategories.includes("dresses") && !items.some((item) => item.category === "dresses")) {
    const hasTopBottom = structure.coreGarments.length >= 2;
    if (!hasTopBottom) warnings.push("missing_main_garment");
  }
  if (input.profile?.formality === "formal" && items.some((item) => /\b(cap|hoodie|backpack|trainer)\b/.test(text(item)))) {
    warnings.push("formal_context_casual_item");
  }

  const missingCore = completeness.completenessStatus === "missing_core_item";
  const missingFootwear = completeness.completenessStatus === "missing_footwear";
  const valid =
    Boolean(items.length) &&
    accessoryValidation.valid &&
    !sanitized.removed.some((entry) => entry.reason === "duplicate_outfit_slot") &&
    (input.allowIncomplete || (!missingCore && !missingFootwear));

  return {
    valid,
    rejectReason: valid ? "" : missingCore ? "missing_core_item" : missingFootwear ? "missing_footwear" : "styling_validation_failed",
    warnings,
    structure
  };
}
