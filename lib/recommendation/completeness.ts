export type OutfitCompletenessStatus = "complete" | "missing_footwear" | "missing_bottom" | "missing_core_item";

export type OutfitCompleteness = {
  completenessStatus: OutfitCompletenessStatus;
  missingCategories: string[];
  completenessWarnings: string[];
  footwearIncluded: boolean;
};

function textFor(item: any) {
  return [item?.category, item?.subcategory, item?.name, item?.garmentType, item?.verifiedMetadata?.garmentType?.value]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isOnePieceOutfit(item: any) {
  const text = textFor(item);
  return item?.category === "dresses" || /dress|gown|jumpsuit|romper|robe|one[-\s]?piece/.test(text);
}

export function isFootwear(item: any) {
  return item?.category === "shoes" || /shoe|sneaker|loafer|sandal|boot|heel|slipper|footwear/.test(textFor(item));
}

export function evaluateOutfitCompleteness(items: any[] = []): OutfitCompleteness {
  const selected = items.filter(Boolean);
  const hasOnePiece = selected.some(isOnePieceOutfit);
  const hasTop = hasOnePiece || selected.some((item) => item.category === "tops");
  const needsBottom = !hasOnePiece;
  const hasBottom = !needsBottom || selected.some((item) => item.category === "bottoms");
  const footwearIncluded = selected.some(isFootwear);
  const missingCategories: string[] = [];

  if (!hasTop) missingCategories.push("top or one-piece outfit");
  if (!hasBottom) missingCategories.push("bottom");
  if (!footwearIncluded) missingCategories.push("shoes");

  const completenessWarnings: string[] = [];
  if (!hasTop) completenessWarnings.push("This look is missing a main clothing item.");
  if (!hasBottom) completenessWarnings.push("This look is missing a bottom item.");
  if (!footwearIncluded) completenessWarnings.push("No shoes found in your wardrobe. Add shoes for a complete outfit.");

  let completenessStatus: OutfitCompletenessStatus = "complete";
  if (!hasTop) completenessStatus = "missing_core_item";
  else if (!hasBottom) completenessStatus = "missing_bottom";
  else if (!footwearIncluded) completenessStatus = "missing_footwear";

  return {
    completenessStatus,
    missingCategories,
    completenessWarnings,
    footwearIncluded
  };
}

export function completenessLabel(status?: string) {
  if (status === "complete") return "Complete look";
  if (status === "missing_footwear") return "Missing shoes";
  if (status === "missing_bottom") return "Missing bottom";
  if (status === "missing_core_item") return "Missing item";
  return "Needs review";
}
