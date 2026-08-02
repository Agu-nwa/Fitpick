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
]);

export function logTaxonomyMetric(event: string, values: Record<string, string | number | boolean> = {}) {
  if (!allowedEvents.has(event)) return;
  console.info("fitpick.wardrobe.taxonomy", {
    event,
    ...Object.fromEntries(Object.entries(values).slice(0, 20)),
    timestamp: new Date().toISOString()
  });
}
