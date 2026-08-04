function fieldValue(item: any, key: string) {
  const verified = item.verifiedMetadata?.[key]?.value;
  if (verified !== undefined && verified !== null && verified !== "") return verified;
  const ai = item.aiAnalysis?.fields?.[key]?.value;
  if (ai !== undefined && ai !== null && ai !== "") return ai;
  const legacy: Record<string, string> = {
    primaryColor: "color",
    fabricEstimate: "fabric",
    occasionSuitability: "occasions",
    weatherSuitability: "weather",
    seasonSuitability: "season",
    formalityScore: "formality"
  };
  return item[legacy[key] || key];
}

function list(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

export function compactWardrobeItemContext(item: any, options: { includeImageUrl?: boolean } = {}) {
  return {
    id: String(item._id),
    name: item.name || "unnamed",
    category: item.category || "unknown",
    garmentType: fieldValue(item, "garmentType") || item.subcategory || "unknown",
    color: fieldValue(item, "primaryColor") || item.color || "unknown",
    secondaryColors: list(fieldValue(item, "secondaryColors")),
    fabric: fieldValue(item, "fabricComposition") || fieldValue(item, "fabricEstimate") || item.fabric || "unknown",
    fit: fieldValue(item, "fit") || item.fit || "unknown",
    silhouette: fieldValue(item, "silhouette") || "unknown",
    occasions: list(fieldValue(item, "occasionSuitability")).concat(list(item.occasions)).slice(0, 10),
    weather: list(fieldValue(item, "weatherSuitability")).concat(list(item.weather)).slice(0, 10),
    season: list(fieldValue(item, "seasonSuitability")).slice(0, 10),
    formality: fieldValue(item, "formalityScore") || "unknown",
    eventRelevance: fieldValue(item, "eventRelevance") || "unknown",
    ...(options.includeImageUrl ? { imageUrl: item.imageUrl || item.thumbnailUrl || "" } : {})
  };
}

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function dateValue(value: unknown) {
  if (!value) return 0;
  const timestamp = new Date(value as string | number | Date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function metadataSignalCount(item: any) {
  return [
    item?.name,
    item?.category,
    item?.subcategory,
    item?.color,
    item?.fabric,
    item?.fit,
    item?.pattern,
    fieldValue(item, "garmentType"),
    fieldValue(item, "primaryColor"),
    fieldValue(item, "fabricEstimate"),
    fieldValue(item, "fit"),
    fieldValue(item, "silhouette"),
    fieldValue(item, "occasionSuitability"),
    fieldValue(item, "weatherSuitability"),
    fieldValue(item, "formalityScore")
  ].filter((value) => Array.isArray(value) ? value.length > 0 : Boolean(value)).length;
}

function deterministicCompare(a: any, b: any) {
  return itemId(a).localeCompare(itemId(b));
}

function byNewestField(field: string) {
  return (a: any, b: any) => dateValue(b?.[field]) - dateValue(a?.[field]) || deterministicCompare(a, b);
}

/**
 * Produces a deterministic, balanced prompt sample. This is deliberately not an
 * ownership list: it only controls how much wardrobe detail is sent to the AI.
 */
export function selectWardrobePromptItems(items: any[], limit = 50) {
  const boundedLimit = Math.max(1, Math.min(limit, 100));
  const eligible = items.filter(Boolean);
  if (eligible.length <= boundedLimit) return [...eligible].sort(deterministicCompare);

  const updatedComparator = byNewestField("updatedAt");
  const byUpdated = [...eligible].sort(updatedComparator);
  const byWorn = [...eligible].sort(byNewestField("lastWornAt"));
  const byRecommended = [...eligible].sort(byNewestField("lastRecommendedAt"));
  const byUnderused = [...eligible].sort((a, b) =>
    Number(a?.recommendationCount || 0) - Number(b?.recommendationCount || 0) ||
    dateValue(a?.lastRecommendedAt) - dateValue(b?.lastRecommendedAt) ||
    deterministicCompare(a, b)
  );
  const byMetadata = [...eligible].sort((a, b) =>
    metadataSignalCount(b) - metadataSignalCount(a) || deterministicCompare(a, b)
  );
  const categories = Array.from(new Set(eligible.map((item) => String(item?.category || "unknown")))).sort();
  const byCategory = categories.flatMap((category, offset) =>
    eligible
      .filter((item) => String(item?.category || "unknown") === category)
      .sort(updatedComparator)
      .map((item, index) => ({ item, index, offset }))
  ).sort((a, b) => a.index - b.index || a.offset - b.offset).map((entry) => entry.item);

  const strategies = [byCategory, byUpdated, byWorn, byRecommended, byUnderused, byMetadata];
  const selected: any[] = [];
  const selectedIds = new Set<string>();
  let cursor = 0;
  while (selected.length < boundedLimit) {
    let added = false;
    for (const strategy of strategies) {
      const item = strategy[cursor];
      const id = itemId(item);
      if (item && id && !selectedIds.has(id)) {
        selected.push(item);
        selectedIds.add(id);
        added = true;
        if (selected.length >= boundedLimit) break;
      }
    }
    cursor += 1;
    if (!added && cursor >= eligible.length) break;
  }

  return selected;
}

export function buildWardrobeContext(items: any[], options: { includeImageUrl?: boolean; limit?: number } = {}) {
  const limit = options.limit || 60;
  return selectWardrobePromptItems(items, limit).map((item) => compactWardrobeItemContext(item, options));
}

export function buildSmallWardrobeFallbackContext(items: any[]) {
  if (items.length >= 3) return "";
  return "Wardrobe is small. Give a graceful answer, use only owned items, and explain missing categories without inventing them.";
}
