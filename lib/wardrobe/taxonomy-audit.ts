import { canonicalTaxonomyDefinitions, resolveCanonicalTaxonomy } from "@/lib/wardrobe/canonical-taxonomy";

export type TaxonomyAuditProblem = { code: string; severity: "warning" | "critical"; itemId: string };
const validCategories = new Set(["tops", "bottoms", "dresses", "outerwear", "shoes", "bags", "accessories", "native", "womens_hair", "underwear"]);
const definitionBySubtype = new Map(canonicalTaxonomyDefinitions.map((entry) => [entry.value, entry]));

function id(item: any) { return String(item?._id || item?.id || "unknown"); }
function list(value: unknown) { return Array.isArray(value) ? value.map((entry) => String(entry).toLowerCase()) : []; }

export function auditWardrobeItem(item: any): TaxonomyAuditProblem[] {
  const problems: TaxonomyAuditProblem[] = [];
  const add = (code: string, severity: TaxonomyAuditProblem["severity"] = "warning") => problems.push({ code, severity, itemId: id(item) });
  const category = String(item?.category || "");
  if (!category) add("missing_category", "critical");
  else if (!validCategories.has(category)) add("invalid_category", "critical");
  const subtype = String(item?.canonicalSubtype || "");
  if (!subtype) add("missing_subtype", "critical");
  if (subtype) {
    const definition = definitionBySubtype.get(subtype);
    if (!definition) add("invalid_subtype_for_category", "critical");
    else if (definition.category !== category) add("category_subtype_mismatch", "critical");
  }
  const resolved = resolveCanonicalTaxonomy(item);
  if (category === "accessories" && (resolved.stylingRole === "unknown" || resolved.needsReview)) add("unknown_accessory_role", "critical");
  if (resolved.source === "legacy" || resolved.source === "fallback" || !item?.taxonomyVersion) add("legacy_not_normalized");
  if (resolved.confidence < 0.7 || Number(item?.taxonomyConfidence || resolved.confidence) < 0.7) add("weak_critical_field_confidence", "critical");
  const occasions = list(item?.occasions || item?.verifiedMetadata?.occasionSuitability?.value);
  const weather = list(item?.weather || item?.verifiedMetadata?.weatherSuitability?.value);
  const formality = String(item?.formalityLevel || item?.formality || "").toLowerCase();
  const text = `${item?.name || ""} ${subtype} ${item?.subcategory || ""}`.toLowerCase();
  if (/formal|wedding|black.tie/.test(occasions.join(" ")) && /gym|sleep|swim|denim shorts|slides/.test(text)) add("implausible_formality", "critical");
  if ((/formal/.test(formality) && occasions.some((entry) => /gym|beach|sleep/.test(entry))) || (/casual/.test(formality) && occasions.some((entry) => /black.tie/.test(entry)))) add("contradictory_occasion_tags");
  if (weather.some((entry) => /hot|summer/.test(entry)) && weather.some((entry) => /snow|freezing/.test(entry))) add("contradictory_weather_tags");
  return problems;
}

export function summarizeTaxonomyAudit(items: any[]) {
  const problems = items.flatMap(auditWardrobeItem);
  const byType = problems.reduce<Record<string, number>>((result, problem) => { result[problem.code] = (result[problem.code] || 0) + 1; return result; }, {});
  const suspiciousIds = new Set(problems.map((problem) => problem.itemId));
  return {
    mode: "read_only",
    totalItems: items.length,
    validItems: items.length - suspiciousIds.size,
    suspiciousItems: suspiciousIds.size,
    recommendationCriticalProblems: problems.filter((problem) => problem.severity === "critical").length,
    commonFailureTypes: Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count })),
    problems
  };
}
