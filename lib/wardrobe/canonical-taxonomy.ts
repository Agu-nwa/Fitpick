import type { WardrobeCategory } from "@/types/wardrobe";

export const WARDROBE_TAXONOMY_VERSION = "wardrobe-taxonomy-v2";

export const wardrobeStructureRoles = ["top", "bottom", "one_piece", "outer_layer", "set", "footwear", "finisher", "carry", "hair_piece", "non_visible_personal_item", "unknown"] as const;
export type WardrobeStructureRole = (typeof wardrobeStructureRoles)[number];

export const wardrobeStylingRoles = ["upper_body", "lower_body", "full_body", "tailored_set", "activewear", "swimwear", "sleepwear", "traditional_wear", "footwear", "waist", "watch", "wrist_jewelry", "neck_jewelry", "neckwear", "ear_jewelry", "hand_jewelry", "ankle_jewelry", "formal_detail", "headwear", "hair_accessory", "carry", "eyewear", "hosiery", "weather_accessory", "other", "unknown"] as const;
export type WardrobeStylingRole = (typeof wardrobeStylingRoles)[number];

export const wardrobeVisibilityRoles = ["primary_visible", "visible_finisher", "primary_carry", "small_leather_good", "travel_luggage", "underlayer", "appearance_item", "not_outfit_visible", "unknown"] as const;
export type WardrobeVisibilityRole = (typeof wardrobeVisibilityRoles)[number];

export const wardrobeSetComponents = ["top", "bottom", "top_layer", "dress", "waistcoat", "headwear", "footwear", "other"] as const;
export type WardrobeSetComponent = (typeof wardrobeSetComponents)[number];

export type CanonicalTaxonomyDefinition = {
  value: string;
  label: string;
  category: WardrobeCategory;
  structureRole: WardrobeStructureRole;
  stylingRole: WardrobeStylingRole;
  visibilityRole: WardrobeVisibilityRole;
  aliases?: string[];
  setComponents?: WardrobeSetComponent[];
  formalityLevel?: string;
  needsReview?: boolean;
  clarification?: "jewelry_role" | "set_components" | "wearing_role" | "carry_role";
};

const d = (definition: CanonicalTaxonomyDefinition) => definition;

export const canonicalTaxonomyDefinitions: CanonicalTaxonomyDefinition[] = [
  ...[
    ["shirt", "Shirt"], ["t_shirt", "T-Shirt"], ["polo", "Polo"], ["blouse", "Blouse"], ["camisole", "Camisole"], ["tank_top", "Tank Top"], ["sweater", "Sweater"], ["knitwear", "Knitwear"], ["hoodie", "Hoodie"], ["sweatshirt", "Sweatshirt"], ["vest", "Vest"], ["waistcoat", "Waistcoat"], ["co_ord_top", "Co-ord Top"]
  ].map(([value, label]) => d({ value, label, category: "tops", structureRole: "top", stylingRole: "upper_body", visibilityRole: "primary_visible" })),
  ...[
    ["jeans", "Jeans"], ["trousers", "Trousers"], ["chinos", "Chinos"], ["shorts", "Shorts"], ["skirt", "Skirt"], ["cargo_trousers", "Cargo Trousers"], ["culottes", "Culottes"], ["co_ord_bottom", "Co-ord Bottom"]
  ].map(([value, label]) => d({ value, label, category: "bottoms", structureRole: "bottom", stylingRole: "lower_body", visibilityRole: "primary_visible" })),
  ...[["dress", "Dress"], ["gown", "Gown"], ["jumpsuit", "Jumpsuit"], ["romper", "Romper"]].map(([value, label]) => d({ value, label, category: "dresses", structureRole: "one_piece", stylingRole: "full_body", visibilityRole: "primary_visible" })),
  ...[["blazer", "Blazer"], ["jacket", "Jacket"], ["coat", "Coat"], ["cardigan", "Cardigan"]].map(([value, label]) => d({ value, label, category: "outerwear", structureRole: "outer_layer", stylingRole: "upper_body", visibilityRole: "primary_visible" })),

  d({ value: "suit", label: "Suit", category: "outerwear", structureRole: "set", stylingRole: "tailored_set", visibilityRole: "primary_visible", needsReview: true, clarification: "set_components", aliases: ["suits & sets"] }),
  d({ value: "trouser_suit", label: "Trouser Suit", category: "outerwear", structureRole: "set", stylingRole: "tailored_set", visibilityRole: "primary_visible", setComponents: ["top_layer", "bottom"] }),
  d({ value: "skirt_suit", label: "Skirt Suit", category: "outerwear", structureRole: "set", stylingRole: "tailored_set", visibilityRole: "primary_visible", setComponents: ["top_layer", "bottom"] }),
  d({ value: "three_piece_suit", label: "Three-Piece Suit", category: "outerwear", structureRole: "set", stylingRole: "tailored_set", visibilityRole: "primary_visible", setComponents: ["top_layer", "bottom", "waistcoat"] }),
  d({ value: "tuxedo", label: "Tuxedo", category: "outerwear", structureRole: "set", stylingRole: "tailored_set", visibilityRole: "primary_visible", setComponents: ["top_layer", "bottom"], formalityLevel: "formal" }),
  ...[["co_ord_set", "Co-ord Set"], ["matching_set", "Matching Set"], ["other_set", "Other Set"]].map(([value, label]) => d({ value, label, category: "outerwear", structureRole: "set", stylingRole: "other", visibilityRole: "primary_visible", needsReview: true, clarification: "set_components" })),

  ...[["activewear_top", "Activewear Top", "top"], ["sports_bra", "Sports Bra", "top"], ["activewear_bottom", "Activewear Bottom", "bottom"], ["leggings", "Activewear Leggings", "bottom"], ["joggers", "Activewear Joggers", "bottom"], ["cycling_shorts", "Cycling Shorts", "bottom"], ["gym_shorts", "Gym Shorts", "bottom"], ["one_piece_activewear", "One-Piece Activewear", "one_piece"]].map(([value, label, structureRole]) => d({ value, label, category: structureRole === "bottom" ? "bottoms" : structureRole === "one_piece" ? "dresses" : "tops", structureRole: structureRole as WardrobeStructureRole, stylingRole: "activewear", visibilityRole: "primary_visible" })),
  ...[["activewear_set", "Activewear Set"], ["tracksuit", "Tracksuit"], ["tracksuit_set", "Tracksuit Set"]].map(([value, label]) => d({ value, label, category: "outerwear", structureRole: "set", stylingRole: "activewear", visibilityRole: "primary_visible", setComponents: ["top_layer", "bottom"] })),

  ...[["swim_top", "Swim Top", "top"], ["rash_guard", "Rash Guard", "top"], ["swim_bottom", "Swim Bottom", "bottom"], ["swim_trunks", "Swim Trunks", "bottom"], ["board_shorts", "Board Shorts", "bottom"], ["one_piece_swimsuit", "One-Piece Swimsuit", "one_piece"], ["cover_up", "Swim Cover-Up", "outer_layer"]].map(([value, label, structureRole]) => d({ value, label, category: structureRole === "bottom" ? "bottoms" : structureRole === "one_piece" ? "dresses" : structureRole === "outer_layer" ? "outerwear" : "tops", structureRole: structureRole as WardrobeStructureRole, stylingRole: "swimwear", visibilityRole: "primary_visible" })),
  ...[["swim_set", "Swim Set"], ["bikini_set", "Bikini Set"]].map(([value, label]) => d({ value, label, category: "dresses", structureRole: "set", stylingRole: "swimwear", visibilityRole: "primary_visible", setComponents: ["top", "bottom"] })),
  d({ value: "other_swimwear", label: "Other Swimwear", category: "tops", structureRole: "unknown", stylingRole: "swimwear", visibilityRole: "primary_visible", needsReview: true, clarification: "wearing_role" }),

  ...[["sleep_top", "Sleep Top", "top"], ["sleep_bottom", "Sleep Bottom", "bottom"], ["nightdress", "Nightdress", "one_piece"], ["onesie_sleepwear", "Sleep Onesie", "one_piece"], ["robe", "Robe", "outer_layer"]].map(([value, label, structureRole]) => d({ value, label, category: structureRole === "bottom" ? "bottoms" : structureRole === "one_piece" ? "dresses" : structureRole === "outer_layer" ? "outerwear" : "tops", structureRole: structureRole as WardrobeStructureRole, stylingRole: "sleepwear", visibilityRole: "primary_visible" })),
  d({ value: "sleep_set", label: "Sleep Set", category: "dresses", structureRole: "set", stylingRole: "sleepwear", visibilityRole: "primary_visible", setComponents: ["top", "bottom"] }),
  d({ value: "nightshirt", label: "Nightshirt", category: "tops", structureRole: "unknown", stylingRole: "sleepwear", visibilityRole: "primary_visible", needsReview: true, clarification: "wearing_role" }),
  d({ value: "other_sleepwear", label: "Other Sleepwear", category: "tops", structureRole: "unknown", stylingRole: "sleepwear", visibilityRole: "primary_visible", needsReview: true, clarification: "wearing_role" }),

  ...[["kaftan", "Kaftan", "one_piece"], ["dashiki", "Dashiki", "top"], ["buba", "Buba", "top"], ["iro_wrapper", "Iro Wrapper", "bottom"], ["wrapper", "Wrapper", "bottom"], ["traditional_blouse", "Traditional Blouse", "top"], ["traditional_skirt", "Traditional Skirt", "bottom"], ["traditional_trousers", "Traditional Trousers", "bottom"], ["traditional_dress", "Traditional Dress", "one_piece"], ["traditional_outer_layer", "Traditional Outer Layer", "outer_layer"]].map(([value, label, structureRole]) => d({ value, label, category: "native", structureRole: structureRole as WardrobeStructureRole, stylingRole: "traditional_wear", visibilityRole: "primary_visible" })),
  ...[["senator_set", "Senator Set"], ["traditional_set", "Traditional Set"]].map(([value, label]) => d({ value, label, category: "native", structureRole: "set", stylingRole: "traditional_wear", visibilityRole: "primary_visible", setComponents: ["top", "bottom"] })),
  d({ value: "agbada", label: "Agbada", category: "native", structureRole: "set", stylingRole: "traditional_wear", visibilityRole: "primary_visible", needsReview: true, clarification: "set_components" }),
  ...[["gele", "Gele"], ["fila", "Fila"], ["traditional_cap", "Traditional Cap"]].map(([value, label]) => d({ value, label, category: "native", structureRole: "finisher", stylingRole: "headwear", visibilityRole: "visible_finisher" })),
  d({ value: "other_traditional_wear", label: "Other Traditional Wear", category: "native", structureRole: "unknown", stylingRole: "traditional_wear", visibilityRole: "unknown", needsReview: true, clarification: "wearing_role" }),

  ...[["necklace", "Necklace", "neck_jewelry"], ["earrings", "Earrings", "ear_jewelry"], ["bracelet", "Bracelet", "wrist_jewelry"], ["bangle", "Bangle", "wrist_jewelry"], ["cuff", "Cuff", "wrist_jewelry"], ["ring", "Ring", "hand_jewelry"], ["anklet", "Anklet", "ankle_jewelry"], ["brooch", "Brooch", "formal_detail"], ["body_jewelry", "Body Jewelry", "other"]].map(([value, label, stylingRole]) => d({ value, label, category: "accessories", structureRole: "finisher", stylingRole: stylingRole as WardrobeStylingRole, visibilityRole: "visible_finisher" })),
  ...[["jewelry_set", "Jewelry Set"], ["other_jewelry", "Other Jewelry"]].map(([value, label]) => d({ value, label, category: "accessories", structureRole: "finisher", stylingRole: "unknown", visibilityRole: "visible_finisher", needsReview: true, clarification: "jewelry_role", aliases: value === "other_jewelry" ? ["jewelry", "jewellery", "fashion jewelry", "gold jewelry"] : [] })),
  ...[["watch", "Watch", "watch"], ["belt", "Belt", "waist"], ["suspenders", "Suspenders", "waist"], ["tie", "Tie", "neckwear"], ["bow_tie", "Bow Tie", "neckwear"], ["neck_scarf", "Neck Scarf", "neckwear"], ["pocket_square", "Pocket Square", "formal_detail"], ["cufflinks", "Cufflinks", "formal_detail"], ["tie_clip", "Tie Clip", "formal_detail"], ["lapel_pin", "Lapel Pin", "formal_detail"], ["socks", "Socks", "hosiery"], ["tights", "Tights", "hosiery"], ["stockings", "Stockings", "hosiery"], ["fascinator", "Fascinator", "headwear"], ["headpiece", "Headpiece", "headwear"], ["hat", "Hat", "headwear"], ["cap", "Cap", "headwear"], ["hair_clip", "Hair Clip", "hair_accessory"], ["hair_band", "Hair Band", "hair_accessory"], ["hair_pin", "Hair Pin", "hair_accessory"], ["sunglasses", "Sunglasses", "eyewear"], ["eyeglasses", "Eyeglasses", "eyewear"], ["umbrella", "Umbrella", "weather_accessory"], ["gloves", "Gloves", "weather_accessory"]].map(([value, label, stylingRole]) => d({ value, label, category: "accessories", structureRole: "finisher", stylingRole: stylingRole as WardrobeStylingRole, visibilityRole: "visible_finisher" })),
  d({ value: "other_accessory", label: "Other Accessory", category: "accessories", structureRole: "finisher", stylingRole: "unknown", visibilityRole: "unknown", needsReview: true, clarification: "wearing_role" }),

  ...[["handbag", "Handbag", "primary_carry"], ["shoulder_bag", "Shoulder Bag", "primary_carry"], ["crossbody_bag", "Crossbody Bag", "primary_carry"], ["tote", "Tote", "primary_carry"], ["clutch", "Clutch", "primary_carry"], ["backpack", "Backpack", "primary_carry"], ["briefcase", "Briefcase", "primary_carry"], ["travel_bag", "Travel Bag", "travel_luggage"], ["duffel", "Duffel", "travel_luggage"], ["suitcase", "Suitcase", "travel_luggage"], ["wallet", "Wallet", "small_leather_good"], ["card_holder", "Card Holder", "small_leather_good"], ["coin_purse", "Coin Purse", "small_leather_good"]].map(([value, label, visibilityRole]) => d({ value, label, category: "bags", structureRole: visibilityRole === "small_leather_good" ? "non_visible_personal_item" : "carry", stylingRole: "carry", visibilityRole: visibilityRole as WardrobeVisibilityRole })),
  d({ value: "small_pouch", label: "Small Pouch", category: "bags", structureRole: "carry", stylingRole: "carry", visibilityRole: "unknown", needsReview: true, clarification: "carry_role" }),
  d({ value: "other_bag", label: "Other Bag", category: "bags", structureRole: "carry", stylingRole: "carry", visibilityRole: "unknown", needsReview: true, clarification: "carry_role" }),

  ...["sneakers", "running_shoes", "training_shoes", "loafers", "oxfords", "derbies", "monk_straps", "dress_shoes", "court_shoes", "pumps", "heels", "wedges", "flats", "ballet_flats", "sandals", "slides", "slippers", "mules", "espadrilles", "boots", "ankle_boots", "chelsea_boots", "work_boots", "safety_shoes", "boat_shoes", "moccasins", "traditional_footwear", "other_footwear"].map((value) => d({ value, label: value.split("_").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "), category: "shoes", structureRole: "footwear", stylingRole: "footwear", visibilityRole: "primary_visible" })),

  ...[["wig", "Wig"], ["hair_extension", "Hair Extension"], ["braiding_hair", "Braiding Hair"], ["ponytail_extension", "Ponytail Extension"], ["clip_in_extension", "Clip-In Extension"], ["hair_topper", "Hair Topper"], ["hair_bundle", "Hair Bundle"], ["closure", "Closure"], ["frontal", "Frontal"], ["hairpiece_other", "Other Hair Piece"]].map(([value, label]) => d({ value, label, category: "womens_hair", structureRole: "hair_piece", stylingRole: "other", visibilityRole: "appearance_item" }))
];

const byValue = new Map(canonicalTaxonomyDefinitions.map((entry) => [entry.value, entry]));
const normalize = (value: unknown) => String(value || "").trim().toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

function exactDefinition(value: unknown, category?: string) {
  const normalized = normalize(value);
  const direct = byValue.get(normalized);
  if (direct && (!category || direct.category === category)) return direct;
  return canonicalTaxonomyDefinitions.find((entry) => (!category || entry.category === category) && [entry.label, ...(entry.aliases || [])].some((alias) => normalize(alias) === normalized));
}

function structuredValue(item: any, key: string) {
  return item?.normalisedMetadata?.specific?.[key] ?? item?.categorySpecificMetadata?.inferred?.[key] ?? item?.categorySpecificMetadata?.[key] ?? item?.aiAnalysis?.categorySpecificMetadata?.[key];
}

export type ResolvedCanonicalTaxonomy = {
  canonicalSubtype: string;
  structureRole: WardrobeStructureRole;
  stylingRole: WardrobeStylingRole;
  visibilityRole: WardrobeVisibilityRole;
  setComponents: WardrobeSetComponent[];
  formalityLevel: string;
  confidence: number;
  evidence: string[];
  needsReview: boolean;
  source: "confirmed" | "canonical" | "ai" | "legacy" | "name" | "fallback" | "unknown";
  taxonomyVersion: string;
};

export function resolveCanonicalTaxonomy(item: any): ResolvedCanonicalTaxonomy {
  const category = String(item?.category || "") as WardrobeCategory;
  const confirmedSubtype = item?.canonicalSubtype && item?.taxonomyNeedsReview === false ? exactDefinition(item.canonicalSubtype, category) : null;
  const canonical = confirmedSubtype || exactDefinition(item?.canonicalSubtype, category);
  const aiRole = structuredValue(item, "role");
  const ai = exactDefinition(aiRole, category);
  const legacy = exactDefinition(item?.subcategory, category);
  const nameExact = exactDefinition(item?.name, category);
  const searchable = normalize([item?.name, item?.subcategory, aiRole, ...(item?.searchMetadata?.tags || [])].filter(Boolean).join(" "));
  const tokenMatch = canonicalTaxonomyDefinitions.find((entry) => entry.category === category && [entry.value, entry.label, ...(entry.aliases || [])].some((alias) => searchable.split("_").includes(normalize(alias)) || searchable.includes(normalize(alias))));
  const definition = canonical || ai || (legacy && !legacy.needsReview ? legacy : null) || nameExact || tokenMatch || legacy;
  const source: ResolvedCanonicalTaxonomy["source"] = confirmedSubtype ? "confirmed" : canonical ? "canonical" : ai ? "ai" : definition === legacy ? "legacy" : nameExact || tokenMatch ? "name" : category ? "fallback" : "unknown";
  const evidence = definition ? [`${source}:${definition.value}`] : category ? [`category:${category}`] : [];
  const fallback: Pick<ResolvedCanonicalTaxonomy, "structureRole" | "stylingRole" | "visibilityRole"> =
    category === "tops" ? { structureRole: "top", stylingRole: "upper_body", visibilityRole: "primary_visible" } :
    category === "bottoms" ? { structureRole: "bottom", stylingRole: "lower_body", visibilityRole: "primary_visible" } :
    category === "dresses" ? { structureRole: "one_piece", stylingRole: "full_body", visibilityRole: "primary_visible" } :
    category === "outerwear" ? { structureRole: "outer_layer", stylingRole: "upper_body", visibilityRole: "primary_visible" } :
    category === "shoes" ? { structureRole: "footwear", stylingRole: "footwear", visibilityRole: "primary_visible" } :
    category === "bags" ? { structureRole: "carry", stylingRole: "carry", visibilityRole: "unknown" } :
    category === "accessories" ? { structureRole: "finisher", stylingRole: "unknown", visibilityRole: "visible_finisher" } :
    category === "womens_hair" ? { structureRole: "hair_piece", stylingRole: "other", visibilityRole: "appearance_item" } :
    { structureRole: "unknown", stylingRole: "unknown", visibilityRole: "unknown" };
  const confidence = confirmedSubtype ? 1 : definition ? (source === "canonical" ? Math.max(0.9, Number(item?.taxonomyConfidence || 0)) : source === "ai" ? 0.88 : source === "legacy" ? 0.82 : 0.72) : category ? 0.35 : 0;
  const ambiguous = !definition || Boolean(definition.needsReview) || definition.stylingRole === "unknown" || definition.structureRole === "unknown";
  return {
    canonicalSubtype: definition?.value || "",
    structureRole: (item?.structureRole && confirmedSubtype ? item.structureRole : definition?.structureRole) || fallback.structureRole,
    stylingRole: (item?.stylingRole && confirmedSubtype ? item.stylingRole : definition?.stylingRole) || fallback.stylingRole,
    visibilityRole: (item?.visibilityRole && confirmedSubtype ? item.visibilityRole : definition?.visibilityRole) || fallback.visibilityRole,
    setComponents: Array.isArray(item?.setComponents) && confirmedSubtype ? item.setComponents : definition?.setComponents || [],
    formalityLevel: String(item?.formalityLevel || definition?.formalityLevel || ""),
    confidence,
    evidence: [...(Array.isArray(item?.taxonomyEvidence) ? item.taxonomyEvidence : []), ...evidence].slice(0, 12),
    needsReview: item?.taxonomyNeedsReview === false && confirmedSubtype ? false : ambiguous,
    source,
    taxonomyVersion: WARDROBE_TAXONOMY_VERSION
  };
}

export function getCanonicalSubtypeOptions(category?: WardrobeCategory | string) {
  return canonicalTaxonomyDefinitions.filter((entry) => !category || entry.category === category);
}

export function getStructureRoleForSubtype(subtype: string) { return exactDefinition(subtype)?.structureRole || "unknown"; }
export function getStylingRoleForSubtype(subtype: string) { return exactDefinition(subtype)?.stylingRole || "unknown"; }
export function getVisibilityRoleForSubtype(subtype: string) { return exactDefinition(subtype)?.visibilityRole || "unknown"; }
export function requiresManualRoleConfirmation(item: any) { return resolveCanonicalTaxonomy(item).needsReview; }
export function isCanonicalTaxonomyComplete(item: any) {
  const resolved = resolveCanonicalTaxonomy(item);
  return Boolean(resolved.canonicalSubtype && resolved.structureRole !== "unknown" && resolved.stylingRole !== "unknown" && resolved.visibilityRole !== "unknown" && !resolved.needsReview);
}

export function canonicalTaxonomyLabel(value: string) { return byValue.get(value)?.label || value.split("_").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" "); }
export function isWardrobeStructureRole(value: unknown): value is WardrobeStructureRole { return wardrobeStructureRoles.includes(value as WardrobeStructureRole); }
export function isWardrobeStylingRole(value: unknown): value is WardrobeStylingRole { return wardrobeStylingRoles.includes(value as WardrobeStylingRole); }
export function isWardrobeVisibilityRole(value: unknown): value is WardrobeVisibilityRole { return wardrobeVisibilityRoles.includes(value as WardrobeVisibilityRole); }
