const allowedEvents = new Set([
  "wardrobe.taxonomy.resolved",
  "wardrobe.taxonomy.needs_review",
  "wardrobe.taxonomy.legacy_fallback",
  "wardrobe.taxonomy.ambiguous_set",
  "wardrobe.taxonomy.generic_jewelry",
  "wardrobe.taxonomy.wallet_not_primary_carry",
  "recommendation.item.omitted_by_role",
  "recommendation.readiness.role_coverage",
  "recommendation.footwear.initially_missing",
  "recommendation.footwear.rescued",
  "recommendation.footwear.no_owned_item",
  "recommendation.footwear.available_but_incompatible",
  "recommendation.accessory.none_selected",
  "recommendation.accessory.rejected_by_role",
  "recommendation.accessory.legacy_unresolved",
  "recommendation.structure.selected",
  "recommendation.structure.incomplete"
  , "recommendation.accessory.considered", "recommendation.accessory.selected", "recommendation.accessory.rejected",
  "recommendation.accessory.rejected_missing_metadata", "recommendation.accessory.rejected_explicit_conflict",
  "recommendation.accessory.selected_sparse_metadata", "recommendation.accessory.review_required",
  "recommendation.footwear.selected_by_rescue", "recommendation.footwear.rejected_weather",
  "recommendation.footwear.rejected_formality", "recommendation.footwear.rejected_structure",
  "recommendation.metadata.neckline_available", "recommendation.metadata.belt_compatibility_available", "recommendation.metadata.cuff_type_available"
]);

export function logTaxonomyMetric(event: string, values: Record<string, string | number | boolean> = {}) {
  if (!allowedEvents.has(event)) return;
  console.info("fitpick.wardrobe.taxonomy", {
    event,
    ...Object.fromEntries(Object.entries(values).slice(0, 20)),
    timestamp: new Date().toISOString()
  });
}
