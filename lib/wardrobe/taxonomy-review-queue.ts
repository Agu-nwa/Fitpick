import { detectTaxonomyConflicts } from "@/lib/wardrobe/taxonomy-review";

export type TaxonomyReviewReason = "taxonomy_conflict" | "missing_canonical_subtype" | "missing_structure_role" | "missing_styling_role" | "missing_visibility_role" | "unresolved_jewelry" | "ambiguous_set" | "ambiguous_carry" | "ambiguous_footwear" | "optional_metadata";
export type TaxonomyReviewPriority = { priority: number; reasons: TaxonomyReviewReason[] };
const unknown = (value: unknown) => !value || value === "unknown";
const isSet = (item: any) => item.structureRole === "set" || /(?:^|_)(?:set|suit)(?:_|$)/i.test(String(item.canonicalSubtype || item.subcategory || ""));
const isJewelry = (item: any) => item.category === "accessories" && /jewel|necklace|earring|bracelet|bangle|ring|pendant|chain/i.test(`${item.canonicalSubtype || ""} ${item.subcategory || ""}`);

export function getTaxonomyReviewPriority(item: any): TaxonomyReviewPriority | null {
  const reasons: TaxonomyReviewReason[] = [];
  const conflict = detectTaxonomyConflicts(item);
  if (conflict.status === "conflicting" || (item.taxonomyConflicts?.length || 0) > 0) reasons.push("taxonomy_conflict");
  if (!item.canonicalSubtype) reasons.push("missing_canonical_subtype");
  if (unknown(item.structureRole)) reasons.push("missing_structure_role");
  if (unknown(item.stylingRole)) reasons.push("missing_styling_role");
  if (unknown(item.visibilityRole)) reasons.push("missing_visibility_role");
  if (isJewelry(item) && (!item.canonicalSubtype || ["jewelry_set", "other_jewelry"].includes(item.canonicalSubtype) || unknown(item.stylingRole))) reasons.push("unresolved_jewelry");
  if (isSet(item) && (!Array.isArray(item.setComponents) || item.setComponents.length === 0)) reasons.push("ambiguous_set");
  if (item.category === "bags" && unknown(item.visibilityRole)) reasons.push("ambiguous_carry");
  if (item.category === "shoes" && (!item.canonicalSubtype || unknown(item.structureRole) || unknown(item.stylingRole))) reasons.push("ambiguous_footwear");
  const explicit = item.taxonomyStatus === "needs_review" || item.taxonomyStatus === "unresolved" || item.taxonomyNeedsReview === true;
  if (!reasons.length && !explicit) return null;
  if (!reasons.length) reasons.push("optional_metadata");
  const priority = reasons.includes("taxonomy_conflict") ? 1 : reasons.includes("ambiguous_footwear") ? 2 : reasons.includes("ambiguous_set") ? 3 : reasons.includes("unresolved_jewelry") ? 4 : reasons.includes("ambiguous_carry") ? 5 : item.category === "accessories" && ["belt", "watch", "cufflinks", "pocket_square", "tie", "bow_tie"].includes(item.canonicalSubtype) ? 6 : item.category === "accessories" ? 7 : reasons.some((reason) => reason.startsWith("missing_")) ? 8 : 9;
  return { priority, reasons: Array.from(new Set(reasons)) };
}

export const isTaxonomyReviewable = (item: any) => getTaxonomyReviewPriority(item) !== null;
const time = (value: unknown) => value ? new Date(String(value)).getTime() || 0 : 0;
export function sortTaxonomyReviewQueue<T extends { id?: string; _id?: unknown; createdAt?: unknown; updatedAt?: unknown }>(items: T[]): T[] {
  return items.filter(isTaxonomyReviewable).slice().sort((a, b) => (getTaxonomyReviewPriority(a)?.priority ?? 99) - (getTaxonomyReviewPriority(b)?.priority ?? 99) || time(b.updatedAt) - time(a.updatedAt) || time(a.createdAt) - time(b.createdAt) || String(a.id || a._id).localeCompare(String(b.id || b._id)));
}

export const taxonomyReviewReasonLabel: Record<TaxonomyReviewReason, string> = {
  taxonomy_conflict: "Some saved item details disagree", missing_canonical_subtype: "The exact item type is missing", missing_structure_role: "How this item fits into an outfit is unclear", missing_styling_role: "How this item should be styled is unclear", missing_visibility_role: "How visible this item is in a look is unclear", unresolved_jewelry: "The jewelry type needs confirmation", ambiguous_set: "The pieces included in this set are unclear", ambiguous_carry: "How this bag is used needs confirmation", ambiguous_footwear: "The footwear type needs confirmation", optional_metadata: "A few styling details could be improved"
};
