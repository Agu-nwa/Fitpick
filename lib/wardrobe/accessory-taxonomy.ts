import { canonicalTaxonomyLabel, resolveCanonicalTaxonomy, type WardrobeStylingRole } from "@/lib/wardrobe/canonical-taxonomy";

export type AccessoryTaxonomyInference = {
  subtype: string;
  subtypeLabel: string;
  role: WardrobeStylingRole;
  confidence: number;
  evidence: string[];
  needsReview: boolean;
};

const patterns: Array<{ subtype: string; role: WardrobeStylingRole; pattern: RegExp }> = [
  { subtype: "watch", role: "watch", pattern: /\b(?:smart\s*)?watch(?:es)?\b/i },
  { subtype: "cufflinks", role: "formal_detail", pattern: /\bcufflinks?\b/i },
  { subtype: "bracelet", role: "wrist_jewelry", pattern: /\bbracelets?\b/i },
  { subtype: "bangle", role: "wrist_jewelry", pattern: /\bbangles?\b/i },
  { subtype: "cuff", role: "wrist_jewelry", pattern: /\bcuffs?\b/i },
  { subtype: "necklace", role: "neck_jewelry", pattern: /\bnecklaces?\b/i },
  { subtype: "pendant", role: "neck_jewelry", pattern: /\bpendants?\b/i },
  { subtype: "chain", role: "neck_jewelry", pattern: /\bchains?\b/i },
  { subtype: "earrings", role: "ear_jewelry", pattern: /\bearrings?\b/i },
  { subtype: "ring", role: "hand_jewelry", pattern: /\brings?\b/i },
  { subtype: "anklet", role: "ankle_jewelry", pattern: /\banklets?\b/i },
  { subtype: "brooch", role: "formal_detail", pattern: /\bbrooch(?:es)?\b/i },
  { subtype: "belt", role: "waist", pattern: /\bbelts?\b/i },
  { subtype: "tie", role: "neckwear", pattern: /\b(?:neck\s*)?ties?\b/i },
  { subtype: "hair_clip", role: "hair_accessory", pattern: /\bhair\s*clips?\b/i }
];

function text(value: unknown) { return Array.isArray(value) ? value.filter(Boolean).join(" ") : String(value || ""); }
function structured(item: any, key: string) {
  return item?.normalisedMetadata?.specific?.[key] ?? item?.categorySpecificMetadata?.inferred?.[key] ?? item?.categorySpecificMetadata?.[key] ?? item?.aiAnalysis?.categorySpecificMetadata?.[key];
}
function match(value: unknown) {
  const source = text(value);
  return patterns.find((entry) => entry.pattern.test(source));
}

export function inferAccessoryTaxonomy(item: any): AccessoryTaxonomyInference {
  const canonical = item?.canonicalSubtype ? resolveCanonicalTaxonomy(item) : null;
  if (canonical?.canonicalSubtype && canonical.stylingRole !== "unknown" && !canonical.needsReview) {
    return { subtype: canonical.canonicalSubtype, subtypeLabel: canonicalTaxonomyLabel(canonical.canonicalSubtype), role: canonical.stylingRole, confidence: Math.max(0.95, canonical.confidence), evidence: [`canonical:${canonical.canonicalSubtype}`], needsReview: false };
  }
  const sources: Array<{ label: string; value: unknown; confidence: number }> = [
    { label: "ai", value: [structured(item, "subtype"), structured(item, "garmentType"), structured(item, "role")], confidence: 0.92 },
    { label: "role", value: item?.stylingRole, confidence: 0.9 },
    { label: "name", value: item?.name, confidence: 0.88 },
    { label: "tags", value: [item?.subcategory, item?.tags, item?.searchMetadata?.tags, item?.description, item?.aiAnalysis?.description], confidence: 0.76 }
  ];
  for (const source of sources) {
    const found = match(source.value);
    if (found) return { subtype: found.subtype, subtypeLabel: canonicalTaxonomyLabel(found.subtype), role: found.role, confidence: source.confidence, evidence: [`${source.label}:${text(source.value).toLowerCase().slice(0, 100)}`], needsReview: false };
  }
  const isGeneric = /jewel|accessor/i.test(text([item?.category, item?.subcategory, item?.name]));
  return { subtype: isGeneric ? "other_jewelry" : "other_accessory", subtypeLabel: isGeneric ? "Other Jewelry" : "Other Accessory", role: "unknown", confidence: item?.category === "accessories" ? 0.35 : 0.1, evidence: [`category:${item?.category || "unknown"}`], needsReview: true };
}
