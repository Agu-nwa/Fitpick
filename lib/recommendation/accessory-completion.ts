import { colorCompatibilityScore } from "@/lib/recommendation/color";
import { normalizeOutfitSlot } from "@/lib/recommendation/outfit-slots";
import { ACCESSORY_SUBTYPE_SCORE_MULTIPLIERS, accessorySubtypeFor, resolveAccessorySubtype, type AccessorySubtype } from "@/lib/wardrobe/accessory-subtypes";
import type { OccasionProfile } from "@/lib/recommendation/occasion-profiles";
import type { OutfitTemplate } from "@/lib/recommendation/outfit-templates";
import {
  formalityScore,
  memoryPreferenceScore,
  metadataList,
  metadataValue,
  occasionScore,
  readinessScore,
  rotationScore,
  seasonScore,
  styleProfileScore,
  weatherScore
} from "@/lib/recommendation/scoring";

export type AccessoryRole =
  | "wrist"
  | "waist"
  | "neck"
  | "carry"
  | "head"
  | "face"
  | "hair"
  | "formal-detail"
  | "weather"
  | "accent";

export const MAX_ACCESSORIES_PER_LOOK = 4;

export const maxPerAccessoryRole: Record<AccessoryRole, number> = {
  wrist: 2,
  waist: 1,
  neck: 1,
  carry: 1,
  head: 1,
  face: 1,
  hair: 1,
  "formal-detail": 1,
  weather: 1,
  accent: 1
};

type AccessoryCandidate = {
  item: any;
  role: AccessoryRole;
  subtype: AccessorySubtype | null;
  score: number;
  compatibilityScore: number;
  metadataConfidence: "high" | "medium" | "low";
  confidenceScore: number;
  threshold: number;
  reasons: string[];
};

export type AccessoryCompletionDecision = {
  status: "included" | "none_available" | "none_compatible" | "not_needed";
  reason: string;
  selectedCount: number;
  candidateCount: number;
  shortlistedCount: number;
  selectedRoles: AccessoryRole[];
  omitted: Array<{ itemId: string; role: AccessoryRole; reason: string }>;
  selectionMode: "ideal" | "safe-fallback" | "none";
  confidence: "high" | "medium" | "low";
  itemDecisions: Array<{
    itemId: string;
    accessorySubtype: AccessorySubtype | null;
    accessoryRole: AccessoryRole;
    metadataConfidence: "high" | "medium" | "low";
    compatibilityScore: number;
    threshold: number;
    selected: boolean;
    rejectionReason: string;
    usedAsGenericAccent: boolean;
    usedProbableSubtype: boolean;
    explanationSpecificity: "specific" | "generic";
    confidenceScore: number;
  }>;
};

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function itemText(item: any) {
  return [
    item?.name,
    item?.category,
    item?.subcategory,
    item?.garmentType,
    item?.brand,
    item?.color,
    metadataValue(item, "category"),
    metadataValue(item, "subcategory"),
    metadataValue(item, "garmentType"),
    metadataValue(item, "brand"),
    metadataValue(item, "role"),
    metadataValue(item, "metalTone"),
    metadataValue(item, "hardwareFinish"),
    metadataList(item, "occasionSuitability").join(" "),
    metadataList(item, "weatherSuitability").join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function accessoryRoleFor(item: any): AccessoryRole {
  const resolution = resolveAccessorySubtype(item);
  const subtype = resolution.subtype;
  if (["watch", "bracelet", "bangle", "cuff"].includes(subtype || "")) return "wrist";
  if (subtype === "belt") return "waist";
  if (["necklace", "pendant", "scarf", "tie"].includes(subtype || "")) return "neck";
  if (["pocket-square", "brooch"].includes(subtype || "")) return "formal-detail";
  if (subtype === "hair-accessory") return "hair";
  if (subtype === "hat") return "head";
  if (subtype === "sunglasses") return "face";
  if (subtype === "gloves") return "weather";
  if (item?.category === "accessories" && !subtype) return "accent";
  const text = itemText(item);

  if (/\b(watch|watches|smartwatch|bracelet|bangle|cuff)\b/.test(text)) return "wrist";
  if (/\b(belt|waist\s?belt)\b/.test(text)) return "waist";
  if (/\b(tie\s?clip|cufflinks?|pocket\s?square|lapel\s?pin)\b/.test(text)) return "formal-detail";
  if (/\b(necklace|chain|tie|bow\s?tie|scarf|shawl)\b/.test(text)) return "neck";
  if (/\b(handbag|tote|crossbody|clutch|backpack|purse|bag)\b/.test(text)) return "carry";
  if (/\b(women'?s hair|wig|wigs|braids?|extensions?|ponytails?|closures?|frontals?|bundles?|hair pieces?)\b/.test(text)) return "hair";
  if (/\b(hat|cap|beanie|headwrap|headwear)\b/.test(text)) return "head";
  if (/\b(sunglasses|eyewear|glasses|shades)\b/.test(text)) return "face";
  if (/\b(umbrella|gloves|raincoat)\b/.test(text)) return "weather";

  return "accent";
}

export function isAccessoryCandidate(item: any) {
  if (item?.category === "womens_hair") return true;
  const slot = normalizeOutfitSlot(item);
  if (slot === "bag" || slot === "accessory") return true;
  return /\b(watch|watches|smartwatch|bracelet|belt|bag|handbag|tote|clutch|crossbody|backpack|necklace|chain|tie|bow\s?tie|scarf|hat|cap|sunglasses|pocket\s?square|cufflinks?|umbrella|gloves|wig|braids?|extensions?|ponytails?|closures?|frontals?|bundles?)\b/.test(itemText(item));
}

export function buildWardrobeCandidatePools(items: any[]) {
  return {
    tops: items.filter((item) => normalizeOutfitSlot(item) === "top"),
    bottoms: items.filter((item) => normalizeOutfitSlot(item) === "bottom"),
    dresses: items.filter((item) => normalizeOutfitSlot(item) === "onePiece"),
    shoes: items.filter((item) => normalizeOutfitSlot(item) === "shoes"),
    outerwear: items.filter((item) => normalizeOutfitSlot(item) === "outerwear"),
    bags: items.filter((item) => normalizeOutfitSlot(item) === "bag"),
    accessories: items.filter((item) => isAccessoryCandidate(item)),
    womensHair: items.filter((item) => accessoryRoleFor(item) === "hair")
  };
}

function accessoryTypeBonus(item: any, role: AccessoryRole, occasionName = "", weatherContext = "") {
  const text = itemText(item);
  const subtype = accessorySubtypeFor(item);
  const occasion = occasionName.toLowerCase();
  const weather = weatherContext.toLowerCase();
  let bonus = 0;

  if (subtype === "watch") bonus += /\bsmartwatch\b/.test(text) ? (/gym|sport|casual|travel|weekend/.test(occasion) ? 18 : 9) : 22;
  if (subtype === "bracelet" || subtype === "bangle") bonus += 12;
  if (subtype === "necklace" || subtype === "pendant") bonus += /dinner|date|wedding|formal|church|party/.test(occasion) ? 18 : 10;
  if (subtype === "earrings") bonus += /dinner|date|wedding|formal|church|party/.test(occasion) ? 18 : 9;
  if (subtype === "ring" || subtype === "anklet") bonus += 9;
  if (subtype === "brooch") bonus += /formal|wedding|business|church/.test(occasion) ? 15 : 6;
  if (/\b(belt)\b/.test(text)) bonus += /work|business|office|formal|interview|dinner/.test(occasion) ? 18 : 11;
  if (role === "carry") bonus += /work|business|travel|dinner|date|wedding|formal|church/.test(occasion) ? 18 : 12;
  if (role === "hair") bonus += /date|dinner|wedding|church|formal|party|event|vacation|photo|preview/.test(occasion) ? 14 : 8;
  if (/\b(tie|bow\s?tie|pocket\s?square|cufflinks?)\b/.test(text)) bonus += /formal|wedding|business|interview|church|event|office/.test(occasion) ? 19 : 4;
  if (/\b(sunglasses)\b/.test(text)) bonus += /sun|summer|vacation|travel|outdoor/.test(`${occasion} ${weather}`) ? 17 : 6;
  if (/\b(scarf|gloves|umbrella|beanie)\b/.test(text)) bonus += /cold|rain|wind|winter/.test(weather) ? 18 : 5;
  if (/\b(hat|cap)\b/.test(text)) bonus += /casual|weekend|travel|vacation|streetwear/.test(occasion) ? 13 : 3;

  return bonus;
}

function restraintPenalty(item: any, role: AccessoryRole, occasionName = "") {
  const text = itemText(item);
  const occasion = occasionName.toLowerCase();

  if (/gym|workout|sport/.test(occasion) && /\b(tie|pocket\s?square|cufflinks?|clutch)\b/.test(text)) return 24;
  if (/formal|business|interview|office/.test(occasion) && role === "head") return 12;
  if (/church|wedding|formal/.test(occasion) && /\b(cap|backpack|sport)\b/.test(text)) return 16;
  if (role === "hair" && /masculine|male/.test(itemText(item))) return 20;
  return 0;
}

function minimumScoreForRole(role: AccessoryRole, occasionName = "", weatherContext = "") {
  const context = `${occasionName} ${weatherContext}`.toLowerCase();
  if (role === "carry") return 34;
  if (role === "wrist") return 34;
  if (role === "waist") return /work|business|office|formal|interview|dinner|date|church/.test(context) ? 33 : 39;
  if (role === "hair") return /date|dinner|wedding|church|formal|party|event|vacation|photo|preview/.test(context) ? 36 : 44;
  if (role === "weather") return /cold|rain|wind|winter|snow|storm|drizzle/.test(context) ? 30 : 44;
  if (role === "formal-detail") return /formal|wedding|business|interview|church|event|office/.test(context) ? 32 : 46;
  if (role === "face") return /sun|summer|vacation|travel|outdoor/.test(context) ? 34 : 44;
  if (role === "head") return /casual|weekend|travel|vacation|streetwear|sun/.test(context) ? 36 : 46;
  return 42;
}

function scoreAccessoryCandidate(input: {
  item: any;
  selectedItems: any[];
  occasionName?: string;
  formality?: string;
  weatherContext?: string;
  repeatDays: number;
  allowNeedsCare?: boolean;
  allowRecentRepeat?: boolean;
  styleProfile?: any;
  memorySummary?: any;
  outfitHistorySummary?: any;
  occasionProfile?: OccasionProfile;
  outfitTemplate?: OutfitTemplate;
}) {
  const role = accessoryRoleFor(input.item);
  const resolution = resolveAccessorySubtype(input.item);
  const subtype = resolution.subtype;
  const colorScore = colorCompatibilityScore([...input.selectedItems, input.item]);
  const occasionPreference = input.occasionProfile?.preferredAccessoryRoles.includes(role) ? 12 : 0;
  const templatePreference = subtype && input.outfitTemplate?.accessoryTerms.some((term) => itemText(input.item).includes(term.toLowerCase())) ? 12 : 0;
  const rawCompatibilityScore =
    occasionScore(input.item, input.occasionName || "") +
    formalityScore(input.item, input.formality) +
    weatherScore(input.item, input.weatherContext || "") +
    seasonScore(input.item, input.weatherContext || "") +
    rotationScore(input.item, input.outfitHistorySummary, Boolean(input.allowRecentRepeat)) +
    readinessScore(input.item, input.allowNeedsCare) +
    styleProfileScore([input.item], input.styleProfile) * 0.75 +
    memoryPreferenceScore([input.item], input.memorySummary, Boolean(input.allowRecentRepeat)) * 0.65 +
    colorScore + occasionPreference + templatePreference +
    accessoryTypeBonus(input.item, role, input.occasionName, input.weatherContext) -
    restraintPenalty(input.item, role, input.occasionName);
  const compatibilityScore = rawCompatibilityScore * ACCESSORY_SUBTYPE_SCORE_MULTIPLIERS[resolution.confidenceLevel];
  const metadataConfidence = resolution.confidenceLevel === "high" ? "high" as const : resolution.confidenceLevel === "medium" ? "medium" as const : "low" as const;
  const threshold = minimumScoreForRole(role, input.occasionName, input.weatherContext);

  const reasons = [
    role,
    colorScore >= 13 ? "color-compatible" : "",
    input.item.condition === "ready" ? "ready" : "",
    accessoryTypeBonus(input.item, role, input.occasionName, input.weatherContext) >= 18 ? "occasion-polish" : ""
  ].filter(Boolean);

  return {
    item: input.item,
    role,
    subtype,
    score: Math.round(compatibilityScore * 10) / 10,
    compatibilityScore: Math.round(compatibilityScore * 10) / 10,
    metadataConfidence,
    confidenceScore: resolution.confidenceScore,
    threshold,
    reasons
  };
}

function isStatement(item: any) {
  return /\b(statement|chunky|oversized|large|bold|heavy)\b/.test(itemText(item));
}

function setConflict(candidates: AccessoryCandidate[]) {
  const wrist = candidates.filter((candidate) => candidate.role === "wrist");
  if (wrist.length > 2) return "wrist_limit_exceeded";
  if (wrist.filter((candidate) => candidate.subtype === "watch").length > 1) return "multiple_watches";
  if (wrist.some((candidate) => candidate.subtype === "watch") && wrist.some((candidate) => candidate.subtype === "cuff")) return "watch_cuff_conflict";
  if (wrist.some((candidate) => candidate.subtype === "cuff") && wrist.some((candidate) => candidate.subtype === "bangle")) return "cuff_bangle_conflict";
  if (candidates.filter((candidate) => isStatement(candidate.item)).length > 1) return "multiple_statement_items";
  const counts = new Map<AccessoryRole, number>();
  for (const candidate of candidates) counts.set(candidate.role, (counts.get(candidate.role) || 0) + 1);
  let roleLimitExceeded = false;
  counts.forEach((count, role) => { if (count > maxPerAccessoryRole[role]) roleLimitExceeded = true; });
  if (roleLimitExceeded) return "role_limit_exceeded";
  return "";
}

function boundedSets(candidates: AccessoryCandidate[]) {
  const sets: AccessoryCandidate[][] = [];
  for (let first = 0; first < candidates.length; first += 1) {
    sets.push([candidates[first]]);
    for (let second = first + 1; second < candidates.length; second += 1) {
      sets.push([candidates[first], candidates[second]]);
      for (let third = second + 1; third < candidates.length; third += 1) sets.push([candidates[first], candidates[second], candidates[third]]);
    }
  }
  return sets.filter((set) => !setConflict(set));
}

export function validateAccessoryRoles(items: any[]) {
  const roleCounts = new Map<AccessoryRole, number>();
  const invalid: Array<{ itemId: string; role: AccessoryRole; reason: string }> = [];

  for (const item of items.filter(isAccessoryCandidate)) {
    const role = accessoryRoleFor(item);
    const count = (roleCounts.get(role) || 0) + 1;
    roleCounts.set(role, count);
    if (count > maxPerAccessoryRole[role]) {
      invalid.push({ itemId: itemId(item), role, reason: "role_limit_exceeded" });
    }
  }

  const candidates = items.filter(isAccessoryCandidate).map((item) => ({ item, role: accessoryRoleFor(item), subtype: accessorySubtypeFor(item), score: 0, compatibilityScore: 0, metadataConfidence: "low" as const, confidenceScore: 0, threshold: 0, reasons: [] }));
  const conflict = setConflict(candidates);
  if (conflict && !invalid.length && candidates.length) invalid.push({ itemId: itemId(candidates[candidates.length - 1].item), role: candidates[candidates.length - 1].role, reason: conflict });
  return { valid: invalid.length === 0, invalid };
}

export function selectAccessoryCompletion(input: {
  selectedItems: any[];
  wardrobeItems: any[];
  occasionName?: string;
  formality?: string;
  weatherContext?: string;
  repeatDays: number;
  allowNeedsCare?: boolean;
  allowRecentRepeat?: boolean;
  styleProfile?: any;
  memorySummary?: any;
  outfitHistorySummary?: any;
  occasionProfile?: OccasionProfile;
  outfitTemplate?: OutfitTemplate;
}) {
  const selectedIds = new Set(input.selectedItems.map(itemId).filter(Boolean));
  const existingRoles = new Set(input.selectedItems.filter(isAccessoryCandidate).map(accessoryRoleFor));
  const candidateItems = input.wardrobeItems
    .filter((item) => !selectedIds.has(itemId(item)))
    .filter((item) => !item.archivedAt)
    .filter((item) => input.allowNeedsCare || item.condition !== "needs-care")
    .filter(isAccessoryCandidate);

  if (!candidateItems.length) {
    return {
      items: [],
      decision: {
        status: "none_available" as const,
        reason: "No saved accessories were available for this look.",
        selectedCount: 0,
        candidateCount: 0,
        shortlistedCount: 0,
        selectedRoles: [],
        omitted: [], selectionMode: "none" as const, confidence: "low" as const, itemDecisions: []
      }
    };
  }

  const scored = candidateItems
    .map((item) => scoreAccessoryCandidate({ ...input, item }))
    .sort((a, b) => b.score - a.score);
  const bestBySubtype = new Map<string, AccessoryCandidate[]>();
  for (const candidate of scored) {
    const key = candidate.subtype || candidate.role;
    const current = bestBySubtype.get(key) || [];
    if (current.length < 2) bestBySubtype.set(key, [...current, candidate]);
  }
  const finalists = Array.from(bestBySubtype.values()).flat()
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const candidateSets = boundedSets(finalists)
    .filter((set) => set.length <= MAX_ACCESSORIES_PER_LOOK)
    .filter((set) => !set.some((candidate) => existingRoles.has(candidate.role) && candidate.role !== "wrist"))
    .map((set) => ({ set, score: set.reduce((total, candidate) => total + candidate.score, 0) + set.length * 3 }))
    .sort((a, b) => b.score - a.score);
  const ideal = candidateSets.find(({ set }) => set.every((candidate) => candidate.score >= candidate.threshold));
  const safeFallback = candidateSets.find(({ set }) => set.length === 1 && set[0].score >= Math.max(16, set[0].threshold - 16));
  const selectedSet = ideal || safeFallback;
  const selected = selectedSet?.set || [];
  const selectionMode = ideal ? "ideal" as const : safeFallback ? "safe-fallback" as const : "none" as const;
  const selectedIdsForDecision = new Set(selected.map((candidate) => itemId(candidate.item)));
  const omitted = finalists.filter((candidate) => !selectedIdsForDecision.has(itemId(candidate.item))).map((candidate) => ({ itemId: itemId(candidate.item), role: candidate.role, reason: candidate.score < candidate.threshold ? "below_ideal_threshold" : "stronger_compatible_set_selected" }));
  const itemDecisions = scored.map((candidate) => ({ itemId: itemId(candidate.item), accessorySubtype: candidate.subtype, accessoryRole: candidate.role, metadataConfidence: candidate.metadataConfidence, confidenceScore: candidate.confidenceScore, compatibilityScore: candidate.compatibilityScore, threshold: candidate.threshold, selected: selectedIdsForDecision.has(itemId(candidate.item)), rejectionReason: selectedIdsForDecision.has(itemId(candidate.item)) ? "" : omitted.find((entry) => entry.itemId === itemId(candidate.item))?.reason || "not_shortlisted", usedAsGenericAccent: !candidate.subtype, usedProbableSubtype: candidate.metadataConfidence === "medium", explanationSpecificity: candidate.metadataConfidence === "high" && Boolean(candidate.subtype) ? "specific" as const : "generic" as const }));

  if (!selected.length) {
    return {
      items: [],
      decision: {
        status: "none_compatible" as const,
        reason: "Saved accessories were available, but none improved this outfit enough to include.",
        selectedCount: 0,
        candidateCount: candidateItems.length,
        shortlistedCount: finalists.length,
        selectedRoles: [],
        omitted, selectionMode, confidence: "low" as const, itemDecisions
      }
    };
  }

  const roleValidation = validateAccessoryRoles([...input.selectedItems, ...selected.map((candidate) => candidate.item)]);
  const validItems = roleValidation.valid
    ? selected.map((candidate) => candidate.item)
    : selected.filter((candidate) => !roleValidation.invalid.some((entry) => entry.itemId === itemId(candidate.item))).map((candidate) => candidate.item);
  const validRoles = validItems.map(accessoryRoleFor);
  const selectedSpecific = selected.find((candidate) => candidate.metadataConfidence === "high" && candidate.subtype);
  const selectedGeneric = selected.some((candidate) => candidate.metadataConfidence !== "high" || !candidate.subtype);
  const reason = selectedGeneric
    ? validItems.length === 1 ? "One of your accessories adds a subtle finishing touch." : "Your accessories add polish without competing with the outfit."
    : selectedSpecific
      ? `Your ${String(selectedSpecific.item.color || "").trim().toLowerCase() ? `${String(selectedSpecific.item.color).trim().toLowerCase()} ` : ""}${selectedSpecific.subtype} adds a polished finishing touch.`
      : "Added a restrained finishing detail.";

  return {
    items: validItems,
    decision: {
      status: "included" as const,
      reason,
      selectedCount: validItems.length,
      candidateCount: candidateItems.length,
      shortlistedCount: finalists.length,
      selectedRoles: validRoles,
      omitted: [...omitted, ...roleValidation.invalid].slice(0, 12),
      selectionMode,
      confidence: selectionMode === "ideal" && selected.every((candidate) => candidate.metadataConfidence === "high") ? "high" as const : selectionMode === "none" ? "low" as const : "medium" as const,
      itemDecisions
    }
  };
}
