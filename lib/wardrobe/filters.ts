import type { WardrobeCategory, WardrobeItem } from "@/types/wardrobe";

export type WardrobeCategoryFilter = "all" | WardrobeCategory;
export type WardrobeWornFilter = "" | "today" | "7d" | "30d" | "never";
export type WardrobeReviewFilter = "" | "needs_review" | "unresolved_jewelry" | "conflicting" | "missing_neckline" | "missing_belt_compatibility" | "missing_cuff_type" | "missing_footwear_attributes";

export type WardrobeFilterState = {
  category: WardrobeCategoryFilter;
  canonicalSubtype?: string;
  structureRole?: string;
  stylingRole?: string;
  visibilityRole?: string;
  formalityLevel?: string;
  color: string;
  occasion: string;
  weather: string;
  worn: WardrobeWornFilter;
  needsCare: boolean;
  review: boolean;
  reviewType: WardrobeReviewFilter;
};

export type WardrobeFacetOption = {
  key: string;
  label: string;
  count: number;
};

export type IndexedWardrobeItem = {
  item: WardrobeItem;
  category: WardrobeCategory;
  canonicalSubtype: string;
  structureRole: string;
  stylingRole: string;
  visibilityRole: string;
  formalityLevel: string;
  taxonomyNeedsReview: boolean;
  reviewFlags: WardrobeReviewFilter[];
  colors: string[];
  occasions: string[];
  weather: string[];
  lastWornAt: Date | null;
  timesWorn: number;
  needsCare: boolean;
};

type SearchParamsLike = {
  get(name: string): string | null;
};

export const wardrobeCategoryFilters: Array<{ id: WardrobeCategoryFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "dresses", label: "Dresses" },
  { id: "native", label: "Native" },
  { id: "outerwear", label: "Outerwear" },
  { id: "shoes", label: "Shoes" },
  { id: "bags", label: "Bags" },
  { id: "accessories", label: "Accessories" },
  { id: "womens_hair", label: "Women's Hair" }
];

export const wardrobeWornFilters: Array<{ id: Exclude<WardrobeWornFilter, "">; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "never", label: "Never worn" }
];

const defaultFilters: WardrobeFilterState = {
  category: "all",
  canonicalSubtype: "",
  structureRole: "",
  stylingRole: "",
  visibilityRole: "",
  formalityLevel: "",
  color: "",
  occasion: "",
  weather: "",
  worn: "",
  needsCare: false,
  review: false
  , reviewType: ""
};

const categoryIds = new Set(wardrobeCategoryFilters.map((filter) => filter.id));
const wornIds = new Set(wardrobeWornFilters.map((filter) => filter.id));
const ignoredFacetValues = new Set(["", "unknown", "none", "n/a", "na", "undefined", "null"]);

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeWardrobeFacet(value: unknown) {
  const clean = cleanText(value).toLowerCase();
  return ignoredFacetValues.has(clean) ? "" : clean;
}

export function displayFacetLabel(value: string) {
  return cleanText(value)
    .split(" ")
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "")
    .join(" ");
}

function toFacetValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toFacetValues);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("value" in record) return toFacetValues(record.value);
    if ("values" in record) return toFacetValues(record.values);
    if ("list" in record) return toFacetValues(record.list);
  }
  if (typeof value === "string") return value.split(/[,/|]+/).map(cleanText).filter(Boolean);
  if (typeof value === "number" || typeof value === "boolean") return [cleanText(value)];
  return [];
}

function metadataValues(item: WardrobeItem, key: string) {
  return [
    ...toFacetValues(item.verifiedMetadata?.[key]),
    ...toFacetValues(item.recommendationMetadata?.[key]),
    ...toFacetValues(item.searchMetadata?.[key]),
    ...toFacetValues(item.userInputMetadata?.[key])
  ];
}

function uniqueFacetKeys(values: unknown[]) {
  return Array.from(new Set(values.flatMap(toFacetValues).map(normalizeWardrobeFacet).filter(Boolean)));
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysAgo(date: Date, now: Date) {
  return Math.floor((startOfDay(now) - startOfDay(date)) / 86_400_000);
}

function matchesCategory(category: WardrobeCategory, filter: WardrobeCategoryFilter) {
  if (filter === "all") return true;
  return category === filter;
}

function matchesWornFilter(indexed: IndexedWardrobeItem, filter: WardrobeWornFilter, now: Date) {
  if (!filter) return true;
  if (filter === "never") return !indexed.lastWornAt && indexed.timesWorn <= 0;
  if (!indexed.lastWornAt) return false;

  const ageDays = daysAgo(indexed.lastWornAt, now);
  if (filter === "today") return ageDays === 0;
  if (filter === "7d") return ageDays >= 0 && ageDays <= 7;
  if (filter === "30d") return ageDays >= 0 && ageDays <= 30;
  return true;
}

function addFacet(map: Map<string, WardrobeFacetOption>, key: string) {
  const normalized = normalizeWardrobeFacet(key);
  if (!normalized) return;

  const existing = map.get(normalized);
  if (existing) {
    existing.count += 1;
    return;
  }
  map.set(normalized, { key: normalized, label: displayFacetLabel(normalized), count: 1 });
}

function sortedFacetOptions(map: Map<string, WardrobeFacetOption>) {
  return Array.from(map.values()).sort((left, right) => left.label.localeCompare(right.label));
}

export function filtersFromSearchParams(params: SearchParamsLike): WardrobeFilterState {
  const category = normalizeWardrobeFacet(params.get("category")) as WardrobeCategoryFilter;
  const worn = normalizeWardrobeFacet(params.get("worn"));
  const care = normalizeWardrobeFacet(params.get("care"));
  const review = normalizeWardrobeFacet(params.get("review"));

  return {
    category: categoryIds.has(category) ? category : "all",
    canonicalSubtype: normalizeWardrobeFacet(params.get("subtype")),
    structureRole: normalizeWardrobeFacet(params.get("structure")),
    stylingRole: normalizeWardrobeFacet(params.get("role")),
    visibilityRole: normalizeWardrobeFacet(params.get("visibility")),
    formalityLevel: normalizeWardrobeFacet(params.get("formality")),
    color: normalizeWardrobeFacet(params.get("color")),
    occasion: normalizeWardrobeFacet(params.get("occasion")),
    weather: normalizeWardrobeFacet(params.get("weather")),
    worn: wornIds.has(worn as Exclude<WardrobeWornFilter, "">) ? worn as WardrobeWornFilter : "",
    needsCare: care === "needs-care" || care === "true" || care === "1",
    review: review === "true" || review === "1" || review === "review",
    reviewType: (params.get("reviewType") || "") as WardrobeReviewFilter
  };
}

export function writeFiltersToSearchParams(params: URLSearchParams, filters: WardrobeFilterState) {
  if (filters.category === "all") params.delete("category");
  else params.set("category", filters.category);

  const taxonomyParams: Array<[string, string | undefined]> = [["subtype", filters.canonicalSubtype], ["structure", filters.structureRole], ["role", filters.stylingRole], ["visibility", filters.visibilityRole], ["formality", filters.formalityLevel]];
  for (const [key, value] of taxonomyParams) {
    if (value) params.set(key, value);
    else params.delete(key);
  }

  if (filters.color) params.set("color", filters.color);
  else params.delete("color");

  if (filters.occasion) params.set("occasion", filters.occasion);
  else params.delete("occasion");

  if (filters.weather) params.set("weather", filters.weather);
  else params.delete("weather");

  if (filters.worn) params.set("worn", filters.worn);
  else params.delete("worn");

  if (filters.needsCare) params.set("care", "needs-care");
  else params.delete("care");

  if (filters.review) params.set("review", "true");
  else params.delete("review");
  if (filters.reviewType) params.set("reviewType", filters.reviewType);
  else params.delete("reviewType");

  return params;
}

export function hasActiveWardrobeFilters(filters: WardrobeFilterState) {
  return (
    filters.category !== "all" ||
    Boolean(filters.canonicalSubtype || filters.structureRole || filters.stylingRole || filters.visibilityRole || filters.formalityLevel) ||
    Boolean(filters.color) ||
    Boolean(filters.occasion) ||
    Boolean(filters.weather) ||
    Boolean(filters.worn) ||
    filters.needsCare ||
    filters.review || Boolean(filters.reviewType)
  );
}

export function buildWardrobeFilterIndex(items: WardrobeItem[]): IndexedWardrobeItem[] {
  return items.map((item) => ({
    item,
    category: item.category,
    canonicalSubtype: normalizeWardrobeFacet(item.canonicalSubtype || ""),
    structureRole: normalizeWardrobeFacet(item.structureRole || ""),
    stylingRole: normalizeWardrobeFacet(item.stylingRole || ""),
    visibilityRole: normalizeWardrobeFacet(item.visibilityRole || ""),
    formalityLevel: normalizeWardrobeFacet(item.formalityLevel || ""),
    taxonomyNeedsReview: item.taxonomyNeedsReview !== false || !item.canonicalSubtype || !item.structureRole || !item.stylingRole,
    reviewFlags: reviewFlagsFor(item),
    colors: uniqueFacetKeys([
      item.color,
      ...metadataValues(item, "color"),
      ...metadataValues(item, "primaryColor"),
      ...metadataValues(item, "secondaryColors"),
      ...metadataValues(item, "colors")
    ]),
    occasions: uniqueFacetKeys([
      ...(item.occasions || []),
      ...metadataValues(item, "occasion"),
      ...metadataValues(item, "occasions"),
      ...metadataValues(item, "occasionSuitability")
    ]),
    weather: uniqueFacetKeys([
      ...(item.weather || []),
      ...metadataValues(item, "weather"),
      ...metadataValues(item, "weatherSuitability"),
      ...metadataValues(item, "seasonSuitability")
    ]),
    lastWornAt: parseDate(item.lastWornAt || item.lastWorn || null),
    timesWorn: typeof item.timesWorn === "number" ? item.timesWorn : 0,
    needsCare: item.condition === "needs-care"
  }));
}

export function buildWardrobeFacetOptions(indexedItems: IndexedWardrobeItem[]) {
  const colors = new Map<string, WardrobeFacetOption>();
  const occasions = new Map<string, WardrobeFacetOption>();
  const weather = new Map<string, WardrobeFacetOption>();

  for (const indexed of indexedItems) {
    indexed.colors.forEach((value) => addFacet(colors, value));
    indexed.occasions.forEach((value) => addFacet(occasions, value));
    indexed.weather.forEach((value) => addFacet(weather, value));
  }

  return {
    colors: sortedFacetOptions(colors),
    occasions: sortedFacetOptions(occasions),
    weather: sortedFacetOptions(weather)
  };
}

export function filterWardrobeIndex(indexedItems: IndexedWardrobeItem[], filters: WardrobeFilterState, now = new Date()) {
  return indexedItems.filter((indexed) => (
    matchesCategory(indexed.category, filters.category) &&
    (!filters.canonicalSubtype || indexed.canonicalSubtype === filters.canonicalSubtype) &&
    (!filters.structureRole || indexed.structureRole === filters.structureRole) &&
    (!filters.stylingRole || indexed.stylingRole === filters.stylingRole) &&
    (!filters.visibilityRole || indexed.visibilityRole === filters.visibilityRole) &&
    (!filters.formalityLevel || indexed.formalityLevel === filters.formalityLevel) &&
    (!filters.color || indexed.colors.includes(filters.color)) &&
    (!filters.occasion || indexed.occasions.includes(filters.occasion)) &&
    (!filters.weather || indexed.weather.includes(filters.weather)) &&
    (!filters.needsCare || indexed.needsCare) &&
    (!filters.review || indexed.taxonomyNeedsReview || indexed.item.condition === "missing-tags" || indexed.item.condition === "needs-care") &&
    (!filters.reviewType || indexed.reviewFlags.includes(filters.reviewType)) &&
    matchesWornFilter(indexed, filters.worn, now)
  ));
}

import { detectTaxonomyConflicts } from "@/lib/wardrobe/taxonomy-review";

export function reviewFlagsFor(item: WardrobeItem): WardrobeReviewFilter[] {
  const flags: WardrobeReviewFilter[] = [];
  const metadata = item.categorySpecificMetadata || {};
  if (item.taxonomyStatus !== "confirmed" || item.taxonomyNeedsReview !== false || !item.canonicalSubtype) flags.push("needs_review");
  if (item.category === "accessories" && (!item.canonicalSubtype || item.canonicalSubtype === "other_jewelry")) flags.push("unresolved_jewelry");
  if (detectTaxonomyConflicts(item).status === "conflicting") flags.push("conflicting");
  if (["tops", "dresses", "native"].includes(item.category) && !metadata.neckline) flags.push("missing_neckline");
  if (item.category === "bottoms" && metadata.beltCompatible === undefined) flags.push("missing_belt_compatibility");
  if (item.category === "tops" && /shirt/i.test(`${item.subcategory || ""} ${item.canonicalSubtype || ""}`) && !metadata.cuffType) flags.push("missing_cuff_type");
  if (item.category === "shoes" && !metadata.footwearAttributes) flags.push("missing_footwear_attributes");
  return flags;
}

export function clearWardrobeFilters(): WardrobeFilterState {
  return { ...defaultFilters };
}
