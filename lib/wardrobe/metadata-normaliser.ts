import type { WardrobeCategory } from "@/types/wardrobe";
import { sanitizeCategorySpecificMetadata } from "@/lib/wardrobe/metadata-validation";
import type { NormalisedWardrobeItemMetadata } from "@/lib/wardrobe/metadata-types";

function fieldValue(item: any, key: string) {
  const verified = item?.verifiedMetadata?.[key]?.value;
  if (verified !== undefined && verified !== null && verified !== "") return verified;
  const ai = item?.aiAnalysis?.fields?.[key]?.value;
  if (ai !== undefined && ai !== null && ai !== "") return ai;
  return item?.[key];
}

function listValue(...values: unknown[]) {
  for (const value of values) {
    if (Array.isArray(value)) return value.map((entry) => String(entry || "").trim()).filter(Boolean).slice(0, 20);
    if (typeof value === "string" && value.trim()) return value.split(",").map((entry) => entry.trim()).filter(Boolean).slice(0, 20);
  }
  return [];
}

function confidenceFrom(item: any, key: string) {
  const verified = item?.verifiedMetadata?.[key];
  if (typeof verified?.confidence === "number") return verified.confidence;
  const ai = item?.aiAnalysis?.fields?.[key];
  if (typeof ai?.confidence === "number") return ai.confidence;
  return 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normaliseWardrobeItemMetadata(item: any): NormalisedWardrobeItemMetadata {
  const category = String(fieldValue(item, "category") || item?.category || "") as WardrobeCategory;
  const subtype = stringValue(fieldValue(item, "subcategory") || item?.subcategory);
  const primaryColor = stringValue(fieldValue(item, "primaryColor") || item?.color);
  const legacySpecific = item?.categorySpecificMetadata || {};
  const aiSpecific = item?.aiAnalysis?.categorySpecificMetadata || {};
  const specific = sanitizeCategorySpecificMetadata({ ...legacySpecific, ...aiSpecific }, category);
  const confidence = {
    category: confidenceFrom(item, "category"),
    subtype: confidenceFrom(item, "subcategory"),
    primaryColor: confidenceFrom(item, "primaryColor"),
    brand: confidenceFrom(item, "brand"),
    material: Math.max(confidenceFrom(item, "fabricEstimate"), confidenceFrom(item, "fabricComposition"))
  };

  const hasStructuredSpecific = Object.keys(specific).length > 0;
  const hasLegacy = Boolean(item?.verifiedMetadata || item?.aiAnalysis || item?.color || item?.fabric || item?.fit);

  return {
    universal: {
      category,
      subtype,
      primaryColor,
      secondaryColors: listValue(fieldValue(item, "secondaryColors")),
      brand: stringValue(fieldValue(item, "brand")),
      pattern: stringValue(fieldValue(item, "pattern") || item?.pattern),
      material: stringValue(fieldValue(item, "fabricComposition") || fieldValue(item, "fabricEstimate") || item?.fabric),
      fabric: stringValue(fieldValue(item, "fabricEstimate") || item?.fabric),
      fit: stringValue(fieldValue(item, "fit") || item?.fit || item?.garmentFit),
      formality: listValue(fieldValue(item, "formalityScore"), item?.formality)[0] || "",
      occasions: listValue(fieldValue(item, "occasionSuitability"), item?.occasions),
      seasons: listValue(fieldValue(item, "seasonSuitability")),
      weatherSuitability: listValue(fieldValue(item, "weatherSuitability"), item?.weather),
      styleTags: listValue(fieldValue(item, "stylingNotes"), item?.recommendationMetadata?.styleTags),
      genderSuitability: listValue(fieldValue(item, "genderPresentation")),
      confidence
    },
    specific,
    confidence,
    source: hasStructuredSpecific && hasLegacy ? "mixed" : hasStructuredSpecific ? "structured" : "legacy"
  };
}

export function normaliseWardrobeItem(item: any) {
  return {
    ...item,
    normalisedMetadata: normaliseWardrobeItemMetadata(item)
  };
}
