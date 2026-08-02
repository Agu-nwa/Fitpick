import { outfitSlotsForItem } from "@/lib/recommendation/outfit-slots";
import { resolveCanonicalTaxonomy } from "@/lib/wardrobe/canonical-taxonomy";
import { type OutfitStructure } from "@/lib/recommendation/outfit-templates";

export type OutfitCompletenessStatus = "complete" | "missing_footwear" | "missing_bottom" | "missing_core_item";

export type OutfitCompleteness = {
  completenessStatus: OutfitCompletenessStatus;
  missingCategories: string[];
  completenessWarnings: string[];
  footwearIncluded: boolean;
  satisfiedStructure: OutfitStructure | null;
  evaluatedStructures: Array<{ structure: OutfitStructure; satisfied: boolean; missing: string[] }>;
};

function textFor(item: any) {
  return [item?.category, item?.subcategory, item?.name, item?.garmentType, item?.verifiedMetadata?.garmentType?.value]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isOnePieceOutfit(item: any) {
  const text = textFor(item);
  return item?.structureRole === "one_piece" || item?.category === "dresses" || /dress|gown|jumpsuit|romper|robe|kaftan|one[-\s]?piece/.test(text);
}

export function isFootwear(item: any) {
  return item?.structureRole === "footwear" || item?.category === "shoes" || /shoe|sneaker|loafer|sandal|boot|heel|slipper|footwear/.test(textFor(item));
}

export function evaluateOutfitCompleteness(items: any[] = [], options: {
  allowedStructures?: OutfitStructure[];
  footwearState?: "footwear_selected" | "footwear_rescued" | "footwear_available_but_incompatible" | "no_owned_footwear" | "footwear_metadata_insufficient";
} = {}): OutfitCompleteness {
  const selected = items.filter(Boolean);
  const hasOnePiece = selected.some(isOnePieceOutfit);
  const nativeItems = selected.filter((item) => resolveCanonicalTaxonomy(item).stylingRole === "traditional_wear" || item.category === "native");
  const hasNativeOnePiece = nativeItems.some((item) => {
    const taxonomy = resolveCanonicalTaxonomy(item);
    return taxonomy.structureRole === "one_piece" || taxonomy.structureRole === "set" || outfitSlotsForItem(item).includes("onePiece");
  });
  const hasNativeTop = nativeItems.some((item) => outfitSlotsForItem(item).includes("top"));
  const hasNativeBottom = nativeItems.some((item) => outfitSlotsForItem(item).includes("bottom"));
  const componentSet = new Set(selected.flatMap((item) => resolveCanonicalTaxonomy(item).setComponents));
  const hasTop = componentSet.has("top") || selected.some((item) => outfitSlotsForItem(item).includes("top"));
  const hasBottom = componentSet.has("bottom") || selected.some((item) => outfitSlotsForItem(item).includes("bottom"));
  const footwearIncluded = selected.some(isFootwear);
  const allowedStructures: OutfitStructure[] = options.allowedStructures?.length ? options.allowedStructures : ["dress_one_piece", "top_bottom", "native_one_piece", "native_separates"];
  const evaluatedStructures = allowedStructures.map((structure) => {
    const missing = structure === "top_bottom"
      ? [!hasTop ? "top" : "", !hasBottom ? "bottom" : ""].filter(Boolean)
      : structure === "dress_one_piece"
        ? [!hasOnePiece || hasNativeOnePiece ? "dress or one-piece" : ""].filter(Boolean)
        : structure === "native_one_piece"
          ? [!hasNativeOnePiece ? "native one-piece" : ""].filter(Boolean)
          : [!hasNativeTop ? "native upper" : "", !hasNativeBottom ? "native lower" : ""].filter(Boolean);
    return { structure, satisfied: missing.length === 0, missing };
  });
  const satisfiedStructure = evaluatedStructures.find((entry) => entry.satisfied)?.structure || null;
  const missingCategories: string[] = [];

  if (!satisfiedStructure) missingCategories.push(...(evaluatedStructures[0]?.missing || ["main clothing item"]));
  if (!footwearIncluded) missingCategories.push("shoes");

  const completenessWarnings: string[] = [];
  if (!satisfiedStructure) completenessWarnings.push("This look does not yet contain one complete outfit structure.");
  if (!footwearIncluded) {
    if (options.footwearState === "no_owned_footwear") completenessWarnings.push("Add footwear to your closet to complete this look.");
    else if (options.footwearState === "footwear_available_but_incompatible") completenessWarnings.push("Your saved footwear was reviewed, but none suited this look.");
    else if (options.footwearState === "footwear_metadata_insufficient") completenessWarnings.push("Your saved footwear needs a little more detail before it can be matched confidently.");
    else completenessWarnings.push("Footwear is still needed to complete this look.");
  }

  let completenessStatus: OutfitCompletenessStatus = "complete";
  if (!satisfiedStructure) completenessStatus = missingCategories.includes("bottom") ? "missing_bottom" : "missing_core_item";
  else if (!footwearIncluded) completenessStatus = "missing_footwear";

  return {
    completenessStatus,
    missingCategories,
    completenessWarnings,
    footwearIncluded,
    satisfiedStructure,
    evaluatedStructures
  };
}

export function completenessLabel(status?: string) {
  if (status === "complete") return "Complete look";
  if (status === "missing_footwear") return "Missing shoes";
  if (status === "missing_bottom") return "Missing bottom";
  if (status === "missing_core_item") return "Missing item";
  return "Needs review";
}
