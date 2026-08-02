import { resolveCanonicalTaxonomy, type WardrobeSetComponent } from "@/lib/wardrobe/canonical-taxonomy";

export type TaxonomyConflictResult = {
  status: "valid" | "needs_review" | "conflicting";
  conflicts: string[];
  proposedResolution?: { canonicalSubtype: string; structureRole: string; stylingRole: string; visibilityRole: string; setComponents: WardrobeSetComponent[] };
};

export function detectTaxonomyConflicts(item: any): TaxonomyConflictResult {
  const expected = resolveCanonicalTaxonomy({ category: item.category, canonicalSubtype: item.canonicalSubtype, name: item.name, taxonomyNeedsReview: false });
  const conflicts: string[] = [];
  if (item.canonicalSubtype && item.stylingRole && item.stylingRole !== "unknown" && expected.stylingRole !== "unknown" && item.stylingRole !== expected.stylingRole) conflicts.push("subtype_role_mismatch");
  if (item.canonicalSubtype && item.structureRole && item.structureRole !== "unknown" && expected.structureRole !== "unknown" && item.structureRole !== expected.structureRole) conflicts.push("subtype_structure_mismatch");
  if (item.canonicalSubtype && item.visibilityRole && item.visibilityRole !== "unknown" && expected.visibilityRole !== "unknown" && item.visibilityRole !== expected.visibilityRole) conflicts.push("subtype_visibility_mismatch");
  if (item.canonicalSubtype === "wallet" && item.visibilityRole === "primary_carry") conflicts.push("wallet_primary_carry_conflict");
  if (conflicts.length) return { status: "conflicting", conflicts, proposedResolution: { canonicalSubtype: expected.canonicalSubtype, structureRole: expected.structureRole, stylingRole: expected.stylingRole, visibilityRole: expected.visibilityRole, setComponents: expected.setComponents } };
  const needsReview = !item.canonicalSubtype || expected.needsReview || item.taxonomyStatus === "needs_review" || item.taxonomyStatus === "unresolved";
  return { status: needsReview ? "needs_review" : "valid", conflicts: [] };
}

export function buildUserTaxonomyConfirmation(item: any, canonicalSubtype: string, setComponents: WardrobeSetComponent[] = []) {
  if (!canonicalSubtype || canonicalSubtype === "not_sure") return { taxonomyStatus: "unresolved" as const, taxonomyConfirmedBy: "system" as const, taxonomyConfirmedAt: null, taxonomyConfidence: 0, taxonomyNeedsReview: true, taxonomyEvidence: ["user:reviewed_uncertain"] };
  const resolved = resolveCanonicalTaxonomy({ category: item.category, name: item.name, canonicalSubtype, taxonomyNeedsReview: false, setComponents });
  return {
    canonicalSubtype: resolved.canonicalSubtype,
    structureRole: resolved.structureRole,
    stylingRole: resolved.stylingRole,
    visibilityRole: resolved.visibilityRole,
    setComponents: setComponents.length ? setComponents : resolved.setComponents,
    taxonomyStatus: resolved.needsReview ? "needs_review" as const : "confirmed" as const,
    taxonomyConfirmedBy: "user" as const,
    taxonomyConfirmedAt: new Date(),
    taxonomyConfidence: 1,
    taxonomyEvidence: ["user:closet_review"],
    taxonomyNeedsReview: resolved.needsReview,
    taxonomyVersion: resolved.taxonomyVersion,
    taxonomyConflicts: []
  };
}

export function taxonomyConfidenceLabel(item: any) {
  if (item.taxonomyConfirmedBy === "user" && item.taxonomyStatus === "confirmed") return "Confirmed by you";
  const value = Number(item.taxonomyConfidence || 0);
  if (value >= 0.85) return "Strong suggestion";
  if (value >= 0.6) return "Possible match";
  return "Needs your help";
}
