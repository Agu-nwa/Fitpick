import { colorCompatibilityScore } from "@/lib/recommendation/color";
import { normalizeOutfitSlot } from "@/lib/recommendation/outfit-slots";
import { resolveCanonicalTaxonomy } from "@/lib/wardrobe/canonical-taxonomy";
import { inferAccessoryTaxonomy } from "@/lib/wardrobe/accessory-taxonomy";
import { logTaxonomyMetric } from "@/lib/wardrobe/taxonomy-observability";
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
  | "waist"
  | "watch"
  | "wrist_jewelry"
  | "neck_jewelry"
  | "neckwear"
  | "ear_jewelry"
  | "hand_jewelry"
  | "ankle_jewelry"
  | "carry"
  | "eyewear"
  | "headwear"
  | "formal_detail"
  | "weather_accessory"
  | "hair_accessory"
  | "other"
  // Legacy aliases remain accepted by stored occasion profiles.
  | "wrist" | "neck" | "ear" | "hand" | "ankle" | "head" | "face" | "hair" | "formal-detail" | "weather" | "accent";

export const MAX_ACCESSORIES_PER_LOOK = 3;

export const maxPerAccessoryRole: Record<AccessoryRole, number> = {
  watch: 1,
  wrist: 1,
  waist: 1,
  neck: 1,
  ear: 1,
  hand: 2,
  ankle: 1,
  carry: 1,
  head: 1,
  face: 1,
  hair: 1,
  "formal-detail": 1,
  weather: 1,
  accent: 1
  , wrist_jewelry: 1, neck_jewelry: 1, neckwear: 1, ear_jewelry: 1, hand_jewelry: 1,
  ankle_jewelry: 1, eyewear: 1, headwear: 1, formal_detail: 1,
  weather_accessory: 1, hair_accessory: 1, other: 1
};

type AccessoryCandidate = {
  item: any;
  role: AccessoryRole;
  score: number;
  reasons: string[];
  positiveSignals: string[];
  penalties: string[];
  missingSignals: string[];
};

export type AccessoryRejectionCode = "duplicate_role" | "occasion_conflict" | "formality_conflict" | "color_conflict" | "weather_conflict" | "wrist_stack_limit" | "structure_conflict" | "lower_ranked_compatible_item" | "insufficient_identity" | "none_compatible";

export type AccessoryDiagnostic = {
  itemId: string;
  role: AccessoryRole;
  score: number;
  selected: boolean;
  positiveSignals: string[];
  penalties: string[];
  missingSignals: string[];
  rejectionCode: AccessoryRejectionCode | "";
};

export type AccessoryCompletionDecision = {
  status: "included" | "none_available" | "none_compatible" | "not_needed";
  reason: string;
  selectedCount: number;
  candidateCount: number;
  shortlistedCount: number;
  selectedRoles: AccessoryRole[];
  omitted: Array<{ itemId: string; role: AccessoryRole; reason: string }>;
  diagnostics: AccessoryDiagnostic[];
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
  const taxonomy = resolveCanonicalTaxonomy(item);
  const inferred = inferAccessoryTaxonomy(item);
  const canonicalRole: Partial<Record<string, AccessoryRole>> = {
    watch: "watch",
    wrist_jewelry: "wrist_jewelry",
    waist: "waist",
    neck_jewelry: "neck_jewelry",
    neckwear: "neckwear",
    ear_jewelry: "ear_jewelry",
    hand_jewelry: "hand_jewelry",
    ankle_jewelry: "ankle_jewelry",
    formal_detail: "formal_detail",
    headwear: "headwear",
    hair_accessory: "hair_accessory",
    carry: "carry",
    eyewear: "eyewear",
    hosiery: "other",
    weather_accessory: "weather_accessory"
  };
  if (!inferred.needsReview && canonicalRole[inferred.role]) return canonicalRole[inferred.role] as AccessoryRole;
  if (!taxonomy.needsReview && canonicalRole[taxonomy.stylingRole]) return canonicalRole[taxonomy.stylingRole] as AccessoryRole;
  const text = itemText(item);

  if (/\b(watch|watches|smartwatch)\b/.test(text)) return "watch";
  if (/\b(bracelet|bangle|cuff)\b/.test(text)) return "wrist_jewelry";
  if (/\b(belt|waist\s?belt)\b/.test(text)) return "waist";
  if (/\b(tie\s?clip|cufflinks?|pocket\s?square|lapel\s?pin)\b/.test(text)) return "formal_detail";
  if (/\b(ties?|bow\s?tie|scarf|shawl)\b/.test(text)) return "neckwear";
  if (/\b(necklace|pendant|chain)\b/.test(text)) return "neck_jewelry";
  if (/\b(earrings?)\b/.test(text)) return "ear_jewelry";
  if (/\b(rings?)\b/.test(text)) return "hand_jewelry";
  if (/\b(anklets?)\b/.test(text)) return "ankle_jewelry";
  if (/\b(handbag|tote|crossbody|clutch|backpack|purse|bag)\b/.test(text)) return "carry";
  if (/\b(hair clips?|headbands?|hair pins?)\b/.test(text)) return "hair_accessory";
  if (/\b(hat|cap|beanie|headwrap|headwear)\b/.test(text)) return "headwear";
  if (/\b(sunglasses|eyewear|glasses|shades)\b/.test(text)) return "eyewear";
  if (/\b(umbrella|gloves|raincoat)\b/.test(text)) return "weather_accessory";

  return "other";
}

export function isAccessoryCandidate(item: any) {
  const taxonomy = resolveCanonicalTaxonomy(item);
  if (taxonomy.structureRole === "hair_piece" || taxonomy.visibilityRole === "appearance_item") return false;
  if (taxonomy.visibilityRole === "small_leather_good" || taxonomy.visibilityRole === "travel_luggage" || taxonomy.visibilityRole === "not_outfit_visible") return false;
  if (taxonomy.structureRole === "carry") return taxonomy.visibilityRole === "primary_carry";
  if (taxonomy.structureRole === "finisher") return true;
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
    womensHair: items.filter((item) => accessoryRoleFor(item) === "hair_accessory")
  };
}

function accessoryTypeBonus(item: any, role: AccessoryRole, occasionName = "", weatherContext = "") {
  const text = itemText(item);
  const occasion = occasionName.toLowerCase();
  const weather = weatherContext.toLowerCase();
  let bonus = 0;

  if (/\b(watch|watches)\b/.test(text)) bonus += 22;
  if (/\b(smartwatch)\b/.test(text)) bonus += /gym|sport|casual|travel|weekend/.test(occasion) ? 18 : 9;
  if (/\b(bracelet|bangle)\b/.test(text)) bonus += 12;
  if (/\b(belt)\b/.test(text)) bonus += /work|business|office|formal|interview|dinner/.test(occasion) ? 18 : 11;
  if (role === "carry") bonus += /work|business|travel|dinner|date|wedding|formal|church/.test(occasion) ? 18 : 12;
  if (role === "hair_accessory") bonus += /date|dinner|wedding|church|formal|party|event|vacation|photo|preview/.test(occasion) ? 14 : 8;
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
  if (/formal|business|interview|office/.test(occasion) && role === "headwear") return 12;
  if (/church|wedding|formal/.test(occasion) && /\b(cap|backpack|sport)\b/.test(text)) return 16;
  if (role === "hair_accessory" && /masculine|male/.test(itemText(item))) return 20;
  return 0;
}

function minimumScoreForRole(role: AccessoryRole, occasionName = "", weatherContext = "") {
  const context = `${occasionName} ${weatherContext}`.toLowerCase();
  if (role === "carry") return 34;
  if (role === "watch" || role === "wrist_jewelry") return 30;
  if (role === "ear_jewelry" || role === "hand_jewelry" || role === "ankle_jewelry" || role === "neck_jewelry") return 32;
  if (role === "waist") return /work|business|office|formal|interview|dinner|date|church/.test(context) ? 33 : 39;
  if (role === "hair_accessory") return /date|dinner|wedding|church|formal|party|event|vacation|photo|preview/.test(context) ? 32 : 40;
  if (role === "weather_accessory") return /cold|rain|wind|winter|snow|storm|drizzle/.test(context) ? 28 : 42;
  if (role === "formal_detail") return /formal|wedding|business|interview|church|event|office/.test(context) ? 30 : 46;
  if (role === "eyewear") return /sun|summer|vacation|travel|outdoor/.test(context) ? 30 : 40;
  if (role === "headwear") return /casual|weekend|travel|vacation|streetwear|sun|native|traditional/.test(context) ? 32 : 44;
  return 34;
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
}) {
  const role = accessoryRoleFor(input.item);
  const colorScore = colorCompatibilityScore([...input.selectedItems, input.item]);
  const positiveSignals: string[] = [];
  const penalties: string[] = [];
  const missingSignals: string[] = [];
  const occasionMetadata = metadataList(input.item, "occasionSuitability").concat(metadataList(input.item, "occasions"));
  const weatherMetadata = metadataList(input.item, "weatherSuitability").concat(metadataList(input.item, "weather"));
  const formalityMetadata = metadataList(input.item, "formality").concat(metadataList(input.item, "formalityScore"));
  if (!occasionMetadata.length) missingSignals.push("occasion"); else positiveSignals.push("occasion_metadata");
  if (!weatherMetadata.length) missingSignals.push("weather"); else positiveSignals.push("weather_metadata");
  if (!formalityMetadata.length) missingSignals.push("formality"); else positiveSignals.push("formality_metadata");
  if (colorScore >= 13) positiveSignals.push("color_compatible"); else if (colorScore < 5) penalties.push("color_conflict");
  if (input.item.condition === "ready") positiveSignals.push("ready");
  // Missing data is deliberately neutral. Only explicit evidence and contextual conflicts move the score materially.
  const score =
    occasionScore(input.item, input.occasionName || "") +
    formalityScore(input.item, input.formality) +
    weatherScore(input.item, input.weatherContext || "") +
    seasonScore(input.item, input.weatherContext || "") +
    rotationScore(input.item, input.outfitHistorySummary, Boolean(input.allowRecentRepeat)) +
    readinessScore(input.item, input.allowNeedsCare) +
    styleProfileScore([input.item], input.styleProfile) * 0.75 +
    memoryPreferenceScore([input.item], input.memorySummary, Boolean(input.allowRecentRepeat)) * 0.65 +
    colorScore + Math.min(missingSignals.length * 2, 5) +
    accessoryTypeBonus(input.item, role, input.occasionName, input.weatherContext) -
    restraintPenalty(input.item, role, input.occasionName);

  const reasons = [
    role,
    colorScore >= 13 ? "color-compatible" : "",
    input.item.condition === "ready" ? "ready" : "",
    accessoryTypeBonus(input.item, role, input.occasionName, input.weatherContext) >= 18 ? "occasion-polish" : ""
  ].filter(Boolean);

  return {
    item: input.item,
    role,
    score: Math.round(score * 10) / 10,
    reasons,
    positiveSignals,
    penalties,
    missingSignals
  };
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
}) {
  const selectedIds = new Set(input.selectedItems.map(itemId).filter(Boolean));
  const existingRoles = new Set(input.selectedItems.filter(isAccessoryCandidate).map(accessoryRoleFor));
  const candidateItems = input.wardrobeItems
    .filter((item) => !selectedIds.has(itemId(item)))
    .filter((item) => !item.archivedAt)
    .filter((item) => input.allowNeedsCare || item.condition !== "needs-care")
    .filter(isAccessoryCandidate);
  const eligibleCandidateItems = candidateItems.filter((item) => {
    const taxonomy = resolveCanonicalTaxonomy(item);
    return !taxonomy.needsReview && taxonomy.stylingRole !== "unknown" && taxonomy.visibilityRole !== "unknown";
  });

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
        omitted: [],
        diagnostics: []
      }
    };
  }

  if (!eligibleCandidateItems.length) {
    logTaxonomyMetric("recommendation.accessory.legacy_unresolved", { unresolvedCount: candidateItems.length });
    return {
      items: [],
      decision: {
        status: "none_compatible" as const,
        reason: "Saved finishing items need a quick role review before they can be styled safely.",
        selectedCount: 0,
        candidateCount: candidateItems.length,
        shortlistedCount: 0,
        selectedRoles: [],
        omitted: candidateItems.slice(0, 12).map((item) => ({ itemId: itemId(item), role: accessoryRoleFor(item), reason: "taxonomy_needs_review" })),
        diagnostics: candidateItems.slice(0, 50).map((item) => ({ itemId: itemId(item), role: accessoryRoleFor(item), score: 0, selected: false, positiveSignals: [], penalties: [], missingSignals: ["identity"], rejectionCode: "insufficient_identity" as const }))
      }
    };
  }

  const scored = eligibleCandidateItems
    .map((item) => scoreAccessoryCandidate({ ...input, item }))
    .sort((a, b) => b.score - a.score);
  const bestByRole = new Map<AccessoryRole, AccessoryCandidate>();
  for (const candidate of scored) {
    const current = bestByRole.get(candidate.role);
    if (!current || candidate.score > current.score) bestByRole.set(candidate.role, candidate);
  }
  const shortlisted = Array.from(bestByRole.values())
    .filter((candidate) => candidate.score >= minimumScoreForRole(candidate.role, input.occasionName, input.weatherContext))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  const selected: AccessoryCandidate[] = [];
  const selectedRoles = new Set<AccessoryRole>(existingRoles);
  const omitted: Array<{ itemId: string; role: AccessoryRole; reason: string }> = [];
  const context = `${input.occasionName || ""} ${input.formality || ""}`.toLowerCase();
  const selectedText = input.selectedItems.map(itemText).join(" ");

  for (const candidate of shortlisted) {
    if (selected.length >= MAX_ACCESSORIES_PER_LOOK) {
      omitted.push({ itemId: itemId(candidate.item), role: candidate.role, reason: "accessory_limit_reached" });
      continue;
    }

    if (selectedRoles.has(candidate.role)) {
      omitted.push({ itemId: itemId(candidate.item), role: candidate.role, reason: "duplicate_role" });
      continue;
    }

    if (candidate.role === "wrist_jewelry" && selectedRoles.has("watch") && !/business|formal|wedding|dinner|party|date/.test(context)) {
      omitted.push({ itemId: itemId(candidate.item), role: candidate.role, reason: "wrist_stack_limit" });
      continue;
    }
    if (candidate.role === "watch" && selectedRoles.has("wrist_jewelry") && !/business|formal|wedding|dinner|party|date/.test(context)) {
      omitted.push({ itemId: itemId(candidate.item), role: candidate.role, reason: "wrist_stack_limit" });
      continue;
    }
    const candidateText = itemText(candidate.item);
    if (/cufflinks?/.test(candidateText) && !/shirt|blouse|french cuff|double cuff/.test(selectedText)) {
      omitted.push({ itemId: itemId(candidate.item), role: candidate.role, reason: "structure_conflict" });
      continue;
    }
    if (/pocket\s?square/.test(candidateText) && !/jacket|blazer|suit|tuxedo/.test(selectedText)) {
      omitted.push({ itemId: itemId(candidate.item), role: candidate.role, reason: "structure_conflict" });
      continue;
    }
    if (candidate.role === "waist" && !/trouser|pants|jeans|chinos|skirt|shorts/.test(selectedText)) {
      omitted.push({ itemId: itemId(candidate.item), role: candidate.role, reason: "structure_conflict" });
      continue;
    }
    if (candidate.role === "neck_jewelry" && selectedRoles.has("ear_jewelry") && /statement|large|chunky/.test(`${candidateText} ${selectedText}`)) {
      omitted.push({ itemId: itemId(candidate.item), role: candidate.role, reason: "structure_conflict" });
      continue;
    }

    selected.push(candidate);
    selectedRoles.add(candidate.role);
  }

  if (!selected.length) {
    logTaxonomyMetric("recommendation.accessory.none_selected", { candidateCount: candidateItems.length, shortlistedCount: shortlisted.length });
    return {
      items: [],
      decision: {
        status: "none_compatible" as const,
        reason: "Saved accessories were available, but none improved this outfit enough to include.",
        selectedCount: 0,
        candidateCount: candidateItems.length,
        shortlistedCount: shortlisted.length,
        selectedRoles: [],
        omitted,
        diagnostics: scored.slice(0, 50).map((candidate) => ({ itemId: itemId(candidate.item), role: candidate.role, score: candidate.score, selected: false, positiveSignals: candidate.positiveSignals, penalties: candidate.penalties, missingSignals: candidate.missingSignals, rejectionCode: (omitted.find((entry) => entry.itemId === itemId(candidate.item))?.reason || "none_compatible") as AccessoryRejectionCode }))
      }
    };
  }

  const roleValidation = validateAccessoryRoles([...input.selectedItems, ...selected.map((candidate) => candidate.item)]);
  const validItems = roleValidation.valid
    ? selected.map((candidate) => candidate.item)
    : selected.filter((candidate) => !roleValidation.invalid.some((entry) => entry.itemId === itemId(candidate.item))).map((candidate) => candidate.item);
  const validRoles = validItems.map(accessoryRoleFor);
  if (omitted.length || roleValidation.invalid.length) logTaxonomyMetric("recommendation.accessory.rejected_by_role", { rejectedCount: omitted.length + roleValidation.invalid.length, selectedCount: validItems.length });

  return {
    items: validItems,
    decision: {
      status: "included" as const,
      reason: validItems.length === 1
        ? "Added one restrained accessory to finish the look."
        : `Added ${validItems.length} restrained accessories across distinct styling roles.`,
      selectedCount: validItems.length,
      candidateCount: candidateItems.length,
      shortlistedCount: shortlisted.length,
      selectedRoles: validRoles,
      omitted: [...omitted, ...roleValidation.invalid].slice(0, 12),
      diagnostics: scored.slice(0, 50).map((candidate) => {
        const selected = validItems.some((item) => itemId(item) === itemId(candidate.item));
        const rejection = omitted.find((entry) => entry.itemId === itemId(candidate.item));
        return { itemId: itemId(candidate.item), role: candidate.role, score: candidate.score, selected, positiveSignals: candidate.positiveSignals, penalties: candidate.penalties, missingSignals: candidate.missingSignals, rejectionCode: selected ? "" : (rejection?.reason || "lower_ranked_compatible_item") as AccessoryRejectionCode };
      })
    }
  };
}
