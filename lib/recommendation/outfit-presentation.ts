import type { OutfitRecommendation, ReferenceFashionItemSummary } from "@/types/outfit";

export type OutfitPresentationItem = {
  key: string;
  id: string;
  source: "wardrobe" | "reference-upload";
  name: string;
  category: string;
  color: string;
  imageUrl: string;
};

function wardrobePresentationItem(item: OutfitRecommendation["items"][number]): OutfitPresentationItem {
  return {
    key: `wardrobe:${item.id}`,
    id: item.id,
    source: "wardrobe",
    name: item.name,
    category: item.category,
    color: item.color || "",
    imageUrl: item.thumbnailUrl || item.imageUrl || item.images?.front?.url || ""
  };
}

function referenceName(item: ReferenceFashionItemSummary) {
  return [item.primaryColor, item.subcategory || item.category]
    .filter(Boolean)
    .join(" ")
    .trim() || "Uploaded fashion item";
}

function referencePresentationItem(item: ReferenceFashionItemSummary): OutfitPresentationItem {
  return {
    key: `reference-upload:${item.id}`,
    id: item.id,
    source: "reference-upload",
    name: referenceName(item),
    category: item.category || "Uploaded item",
    color: item.primaryColor || "",
    imageUrl: item.imageUrl || ""
  };
}

/**
 * Builds the visual contract for an outfit without changing wardrobe ownership.
 * Uploaded anchors stay reference items, while owned garments stay wardrobe items.
 */
export function buildOutfitPresentationItems(
  outfit: OutfitRecommendation,
  explicitReference?: ReferenceFashionItemSummary | null
) {
  const wardrobeById = new Map(outfit.items.map((item) => [item.id, wardrobePresentationItem(item)] as const));
  const references = [...(explicitReference ? [explicitReference] : []), ...(outfit.referenceItems || [])];
  const referenceById = new Map<string, OutfitPresentationItem>();

  for (const reference of references) {
    if (!reference?.id || referenceById.has(reference.id)) continue;
    referenceById.set(reference.id, referencePresentationItem(reference));
  }

  const ordered: OutfitPresentationItem[] = [];
  const seen = new Set<string>();
  const append = (item?: OutfitPresentationItem) => {
    if (!item || seen.has(item.key)) return;
    seen.add(item.key);
    ordered.push(item);
  };

  for (const piece of outfit.outfitPieces || []) {
    if (piece.source === "reference-upload") {
      append(referenceById.get(String(piece.referenceItemId || "")));
    } else {
      append(wardrobeById.get(String(piece.wardrobeItemId || "")));
    }
  }

  // Legacy recommendations may have reference metadata but no outfitPieces.
  for (const reference of Array.from(referenceById.values())) append(reference);
  for (const item of Array.from(wardrobeById.values())) append(item);

  return ordered;
}
