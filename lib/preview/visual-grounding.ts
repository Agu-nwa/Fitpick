import { isFootwear } from "@/lib/recommendation/completeness";

export type VisualGroundingStatus = "grounded" | "partially_grounded" | "missing_references" | "failed";

export type VisualGroundingChecklistItem = {
  wardrobeItemId: string;
  name: string;
  category: string;
  subcategory: string;
  imageReferenceUrl: string;
  hasImageReference: boolean;
};

export type VisualGroundingSummary = {
  groundedItemIds: string[];
  missingVisualItemIds: string[];
  visualizationWarnings: string[];
  footwearIncluded: boolean;
  visualGroundingStatus: VisualGroundingStatus;
  checklist: VisualGroundingChecklistItem[];
};

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

function variantUrl(image: any, key: "thumbnail" | "original") {
  const variant = image?.variants?.[key];
  return variant?.status === "ready" && variant?.url ? variant.url : "";
}

export function preferredVisualReferenceUrl(item: any) {
  const front = item?.images?.front || {};
  const back = item?.images?.back || {};
  return (
    item?.thumbnailUrl ||
    variantUrl(front, "thumbnail") ||
    variantUrl(back, "thumbnail") ||
    item?.imageUrl ||
    variantUrl(front, "original") ||
    variantUrl(back, "original") ||
    front?.url ||
    back?.url ||
    ""
  );
}

export function buildVisualGroundingChecklist(outfitItems: any[] = []): VisualGroundingChecklistItem[] {
  return outfitItems.filter(Boolean).map((item) => {
    const imageReferenceUrl = preferredVisualReferenceUrl(item);
    return {
      wardrobeItemId: itemId(item),
      name: item?.name || "Unknown item",
      category: item?.category || "unknown",
      subcategory: item?.subcategory || "",
      imageReferenceUrl,
      hasImageReference: Boolean(imageReferenceUrl)
    };
  });
}

export function validatePreviewPromptCoverage(outfitItems: any[] = [], promptInput: { outfitDescription?: string } = {}) {
  const text = String(promptInput.outfitDescription || "");
  const checklist = buildVisualGroundingChecklist(outfitItems);
  const missingPromptItemIds = checklist
    .filter((item) => item.wardrobeItemId && !text.includes(item.wardrobeItemId))
    .map((item) => item.wardrobeItemId);
  const missingPromptCategories = checklist
    .filter((item) => item.category && !text.toLowerCase().includes(item.category.toLowerCase()))
    .map((item) => item.category);

  return {
    checklist,
    missingPromptItemIds,
    missingPromptCategories,
    covered: !missingPromptItemIds.length && !missingPromptCategories.length
  };
}

export function summarizeVisualizationRisks(outfitItems: any[] = [], promptInput: { outfitDescription?: string } = {}): VisualGroundingSummary {
  const promptCoverage = validatePreviewPromptCoverage(outfitItems, promptInput);
  const checklist = promptCoverage.checklist;
  const footwearIncluded = outfitItems.some(isFootwear);
  const missingVisualItemIds = checklist.filter((item) => !item.hasImageReference).map((item) => item.wardrobeItemId).filter(Boolean);
  const groundedItemIds = checklist.map((item) => item.wardrobeItemId).filter(Boolean);
  const visualizationWarnings: string[] = ["This preview uses your wardrobe as reference, but it is not perfect fitting."];

  for (const item of checklist) {
    if (!item.hasImageReference) {
      const label = [item.name, item.category].filter(Boolean).join(" ");
      visualizationWarnings.push(`Avatar preview may not match ${label} exactly because item image is missing.`);
    }
  }

  if (!footwearIncluded) visualizationWarnings.push("Shoes are missing from this outfit.");
  for (const id of promptCoverage.missingPromptItemIds) visualizationWarnings.push(`Selected item ${id} is missing from preview prompt coverage.`);

  let visualGroundingStatus: VisualGroundingStatus = "grounded";
  if (!checklist.length) visualGroundingStatus = "failed";
  else if (missingVisualItemIds.length) visualGroundingStatus = "missing_references";
  else if (!promptCoverage.covered || !footwearIncluded) visualGroundingStatus = "partially_grounded";

  return {
    groundedItemIds,
    missingVisualItemIds,
    visualizationWarnings: Array.from(new Set(visualizationWarnings)).slice(0, 12),
    footwearIncluded,
    visualGroundingStatus,
    checklist
  };
}
