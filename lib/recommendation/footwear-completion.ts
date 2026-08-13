import { colorCompatibilityScore } from "@/lib/recommendation/color";
import { isFootwear } from "@/lib/recommendation/completeness";
import { outfitSlotsForItem, sanitizeOutfitItems } from "@/lib/recommendation/outfit-slots";
import { metadataList, scoreOutfit } from "@/lib/recommendation/scoring";
import { footwearAttributeScore } from "@/lib/recommendation/attribute-intelligence";

export type FootwearCompletionState =
  | "footwear_selected"
  | "footwear_rescued"
  | "footwear_available_but_incompatible"
  | "no_owned_footwear"
  | "footwear_metadata_insufficient";

export type FootwearDiagnostic = {
  itemId: string;
  score: number;
  selected: boolean;
  positiveSignals: string[];
  penalties: string[];
  missingSignals: string[];
  rejectionCode: "occasion_conflict" | "formality_conflict" | "weather_conflict" | "lower_ranked_compatible_item" | "none_compatible" | "";
};

function id(item: any) { return String(item?._id || item?.id || ""); }
function normalized(values: unknown[]) { return values.flatMap((value) => Array.isArray(value) ? value : [value]).filter(Boolean).join(" ").toLowerCase(); }
function explicitConflict(values: string[], context = "") {
  if (!values.length || !context) return false;
  const target = context.toLowerCase();
  return !values.some((value) => target.includes(value.toLowerCase()) || value.toLowerCase().includes(target));
}

export function completeFootwear(input: {
  selectedItems: any[];
  allWardrobeItems: any[];
  occasion?: string;
  formality?: string;
  weather?: string;
  stylePreferences?: any;
  recentWearHistory?: any;
  scoringInput?: any;
  allowNeedsCare?: boolean;
}) {
  const sanitized = sanitizeOutfitItems(input.selectedItems || []);
  const existing = sanitized.items.find(isFootwear);
  if (existing) return { items: sanitized.items, state: "footwear_selected" as const, rescued: false, candidateCount: 0, diagnostics: [] as FootwearDiagnostic[] };

  const owned = (input.allWardrobeItems || []).filter((item) => !item.archivedAt && (isFootwear(item) || outfitSlotsForItem(item).includes("shoes")));
  if (!owned.length) return { items: sanitized.items, state: "no_owned_footwear" as const, rescued: false, candidateCount: 0, diagnostics: [] as FootwearDiagnostic[] };

  const diagnostics = owned.map((shoe): FootwearDiagnostic => {
    const occasionValues = metadataList(shoe, "occasionSuitability").concat(metadataList(shoe, "occasions"));
    const weatherValues = metadataList(shoe, "weatherSuitability").concat(metadataList(shoe, "weather"));
    const formalityValues = metadataList(shoe, "formality").concat(metadataList(shoe, "formalityScore"));
    const penalties: string[] = [];
    const missingSignals: string[] = [];
    const positiveSignals: string[] = ["owned_footwear"];
    if (!occasionValues.length) missingSignals.push("occasion"); else if (explicitConflict(occasionValues, input.occasion)) penalties.push("occasion_conflict");
    if (!weatherValues.length) missingSignals.push("weather"); else if (explicitConflict(weatherValues, input.weather)) penalties.push("weather_conflict");
    if (!formalityValues.length) missingSignals.push("formality"); else if (explicitConflict(formalityValues, input.formality)) penalties.push("formality_conflict");
    if (shoe.condition === "needs-care" && !input.allowNeedsCare) penalties.push("condition_conflict");
    const footwear = shoe.footwearAttributes || {};
    const context = normalized([input.occasion, input.formality, input.weather]);
    if (footwear.toeStyle === "open" && /rain|cold|snow|storm|winter/.test(context)) penalties.push("weather_conflict");
    const selectedLength = input.selectedItems.map((item) => item.garmentLength).find((value) => value && value !== "unknown");
    let metadataAdjustment = 0;
    if (/formal|business|gala|wedding/.test(context) && footwear.toeStyle === "closed") { metadataAdjustment += 12; positiveSignals.push("formal_construction"); }
    if (/formal|business|gala/.test(context) && footwear.toeStyle === "open") metadataAdjustment -= 12;
    if (selectedLength && footwear.dressCompatibility?.includes?.(selectedLength)) { metadataAdjustment += 8; positiveSignals.push("garment_length_compatible"); }
    if (input.stylePreferences?.comfortPriority === "high" && footwear.comfortLevel === "high") { metadataAdjustment += 9; positiveSignals.push("comfort_preference"); }
    if (!footwear.toeStyle || footwear.toeStyle === "unknown") missingSignals.push("toe_style");
    if (!footwear.comfortLevel || footwear.comfortLevel === "unknown") missingSignals.push("comfort");
    const attributeResult = footwearAttributeScore(shoe, sanitized.items, {
      occasionName: input.occasion,
      formality: input.formality,
      weatherContext: input.weather,
      styleProfile: input.stylePreferences
    });
    metadataAdjustment += attributeResult.score;
    positiveSignals.push(...attributeResult.reasons.filter((reason) => !reason.includes("conflict")));
    penalties.push(...attributeResult.reasons.filter((reason) => reason.includes("conflict")));
    const base = scoreOutfit([...sanitized.items, shoe], { ...(input.scoringInput || {}), occasionName: input.occasion, formality: input.formality, weatherContext: input.weather });
    const color = colorCompatibilityScore([...sanitized.items, shoe]);
    const recent = shoe.lastWornAt ? new Date(shoe.lastWornAt).getTime() : 0;
    const recentPenalty = recent && Date.now() - recent < 7 * 86_400_000 ? 5 : 0;
    const score = Math.round((base + color + metadataAdjustment - penalties.length * 35 - recentPenalty) * 10) / 10;
    const rejectionCode = penalties.includes("occasion_conflict") ? "occasion_conflict" : penalties.includes("formality_conflict") ? "formality_conflict" : penalties.includes("weather_conflict") ? "weather_conflict" : "";
    if (color >= 13) positiveSignals.push("color_compatible");
    if (!recentPenalty) positiveSignals.push("rotation_ready");
    return { itemId: id(shoe), score, selected: false, positiveSignals, penalties, missingSignals, rejectionCode };
  });
  const compatible = diagnostics.filter((entry) => !entry.penalties.length).sort((a, b) => b.score - a.score || a.itemId.localeCompare(b.itemId));
  if (!compatible.length) return { items: sanitized.items, state: "footwear_available_but_incompatible" as const, rescued: false, candidateCount: owned.length, diagnostics: diagnostics.map((entry) => ({ ...entry, rejectionCode: entry.rejectionCode || "none_compatible" })) };
  const winner = compatible[0];
  const shoe = owned.find((entry) => id(entry) === winner.itemId);
  const finalized = diagnostics.map((entry) => entry.itemId === winner.itemId ? { ...entry, selected: true, rejectionCode: "" as const } : { ...entry, rejectionCode: entry.rejectionCode || "lower_ranked_compatible_item" as const });
  return { items: sanitizeOutfitItems([...sanitized.items, shoe]).items, state: "footwear_rescued" as const, rescued: true, candidateCount: owned.length, diagnostics: finalized };
}
