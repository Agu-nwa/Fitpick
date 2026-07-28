import fs from "node:fs";
import path from "node:path";
import {
  buildWardrobeFacetOptions,
  buildWardrobeFilterIndex,
  filterWardrobeIndex,
  filtersFromSearchParams,
  hasActiveWardrobeFilters,
  writeFiltersToSearchParams
} from "../lib/wardrobe/filters";
import type { WardrobeItem } from "../types/wardrobe";

const root = process.cwd();
const now = new Date("2026-07-23T12:00:00.000Z");

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function item(input: Partial<WardrobeItem> & Pick<WardrobeItem, "id" | "name" | "category" | "color">): WardrobeItem {
  return {
    subcategory: "",
    formality: [],
    occasions: [],
    weather: [],
    condition: "ready",
    ...input
  };
}

const wardrobe: WardrobeItem[] = [
  item({
    id: "shoe-1",
    name: "Black sneakers",
    category: "shoes",
    color: "Black",
    occasions: ["weekend", "travel"],
    weather: ["winter", "rain"],
    lastWornAt: "2026-07-23T08:00:00.000Z",
    timesWorn: 3
  }),
  item({
    id: "top-1",
    name: "White tee",
    category: "tops",
    color: "White",
    occasions: ["weekend"],
    weather: ["summer"],
    lastWornAt: "2026-07-18T08:00:00.000Z",
    timesWorn: 1
  }),
  item({
    id: "coat-1",
    name: "Camel coat",
    category: "outerwear",
    color: "Camel",
    weather: ["winter"],
    condition: "needs-care",
    timesWorn: 0
  }),
  item({
    id: "bag-1",
    name: "Black tote",
    category: "bags",
    color: "Black",
    occasions: ["work"],
    weather: ["all season"],
    timesWorn: 0
  }),
  item({
    id: "review-1",
    name: "Blue skirt",
    category: "bottoms",
    color: "Blue",
    condition: "missing-tags",
    timesWorn: 0
  })
];

const index = buildWardrobeFilterIndex(wardrobe);
const facets = buildWardrobeFacetOptions(index);
const baseFilters = { category: "all" as const, color: "", occasion: "", weather: "", worn: "" as const, needsCare: false, review: false };

assert(facets.colors.map((option) => option.label).join(",") === "Black,Blue,Camel,White", "color facets should be alphabetical");
assert(filterWardrobeIndex(index, { ...baseFilters, category: "shoes" }, now).map((entry) => entry.item.id).join(",") === "shoe-1", "Shoes category should filter immediately");
assert(filterWardrobeIndex(index, { ...baseFilters, category: "bags" }, now).map((entry) => entry.item.id).join(",") === "bag-1", "Bags category should filter independently");
assert(filterWardrobeIndex(index, { ...baseFilters, category: "accessories" }, now).length === 0, "Accessories should not include bags");
assert(filterWardrobeIndex(index, { ...baseFilters, category: "shoes", color: "black", weather: "winter" }, now).map((entry) => entry.item.id).join(",") === "shoe-1", "combined category, color, and weather filters should work");
assert(filterWardrobeIndex(index, { ...baseFilters, worn: "today" }, now).map((entry) => entry.item.id).join(",") === "shoe-1", "recently worn today should work");
assert(filterWardrobeIndex(index, { ...baseFilters, worn: "7d" }, now).length === 2, "last 7 days worn filter should work");
assert(filterWardrobeIndex(index, { ...baseFilters, worn: "never" }, now).map((entry) => entry.item.id).join(",") === "coat-1,bag-1,review-1", "never worn filter should work");
assert(filterWardrobeIndex(index, { ...baseFilters, needsCare: true }, now).map((entry) => entry.item.id).join(",") === "coat-1", "needs care filter should work");
assert(filterWardrobeIndex(index, { ...baseFilters, review: true }, now).map((entry) => entry.item.id).join(",") === "coat-1,review-1", "review filter should include needs-care and missing-tags items");

const parsed = filtersFromSearchParams(new URLSearchParams("category=tops&color=black&worn=never&care=needs-care&review=true"));
assert(parsed.category === "tops" && parsed.color === "black" && parsed.worn === "never" && parsed.needsCare && parsed.review, "URL params should restore filters");
assert(hasActiveWardrobeFilters(parsed), "active filter detection should work");
const query = writeFiltersToSearchParams(new URLSearchParams(), parsed).toString();
assert(query.includes("category=tops") && query.includes("color=black") && query.includes("care=needs-care") && query.includes("review=true"), "filters should serialize back to URL params");

const page = read("app/wardrobe/page.tsx");
const client = read("components/wardrobe/WardrobeListClient.tsx");
assert(page.includes("<Suspense"), "wardrobe page should wrap search-param client in Suspense");
assert(!page.includes("const categories"), "static decorative category chips should be removed from server page");
assert(client.includes("useSearchParams"), "wardrobe filters should be synchronized with URL search params");
assert(client.includes("aria-pressed"), "filter controls should expose pressed state");
assert(client.includes("router.push"), "filter changes should update browser history without reload");
assert(client.includes("FilteredEmptyState"), "filtered empty state should be present");
assert(client.includes("Add Piece"), "filtered empty state should include Add Piece shortcut");

console.log("wardrobe-filtering: ok");
