import { metadataValue } from "@/lib/recommendation/scoring";

export type OutfitSlot = "top" | "bottom" | "onePiece" | "outerwear" | "shoes" | "bag" | "accessory" | "unknown";

const slotPatterns: Array<{ slot: OutfitSlot; pattern: RegExp }> = [
  { slot: "onePiece", pattern: /\b(dresses?|gowns?|native|agbada|kaftans?|jumpsuits?|rompers?|one[-\s]?piece|aso[-\s]?ebi)\b/i },
  { slot: "outerwear", pattern: /\b(outerwear|jackets?|coats?|blazers?|cardigans?|overcoats?|trench)\b/i },
  { slot: "bottom", pattern: /\b(bottoms?|trousers?|pants?|jeans?|shorts?|skirts?|chinos?)\b/i },
  { slot: "shoes", pattern: /\b(shoes?|sneakers?|loafers?|boots?|sandals?|heels?|slippers?|trainers?)\b/i },
  { slot: "bag", pattern: /\b(bags?|handbags?|purses?|clutches?|totes?|backpacks?)\b/i },
  { slot: "accessory", pattern: /\b(accessories|watch|watches|jewelry|jewellery|belts?|caps?|hats?|sunglasses|scarves?|ties?)\b/i },
  { slot: "top", pattern: /\b(tops?|shirts?|t[-\s]?shirts?|tees?|blouses?|polos?|sweaters?|sweatshirts?|hoodies?|knits?)\b/i }
];

function textForSlot(item: any) {
  return [
    item?.category,
    item?.subcategory,
    item?.name,
    item?.garmentType,
    metadataValue(item, "category"),
    metadataValue(item, "subcategory"),
    metadataValue(item, "garmentType")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function normalizeOutfitSlot(item: any): OutfitSlot {
  const text = textForSlot(item);
  for (const entry of slotPatterns) {
    if (entry.pattern.test(text)) return entry.slot;
  }
  return "unknown";
}

export function categoryToOutfitSlot(category = ""): OutfitSlot {
  return normalizeOutfitSlot({ category, subcategory: category, name: category });
}

function itemId(item: any) {
  return String(item?._id || item?.id || "");
}

export function sanitizeOutfitItems(items: any[] = []) {
  const selected: any[] = [];
  const removed: Array<{ itemId: string; slot: OutfitSlot; reason: string }> = [];
  const seenIds = new Set<string>();
  const selectedBySlot = new Map<OutfitSlot, any[]>();

  function removeItem(item: any, slot: OutfitSlot, reason: string) {
    removed.push({ itemId: itemId(item), slot, reason });
  }

  for (const item of items.filter(Boolean)) {
    const id = itemId(item);
    if (id && seenIds.has(id)) {
      removeItem(item, normalizeOutfitSlot(item), "duplicate_item");
      continue;
    }

    const slot = normalizeOutfitSlot(item);
    const existing = selectedBySlot.get(slot) || [];
    const onePieceSelected = (selectedBySlot.get("onePiece") || []).length > 0;

    if (slot === "bottom" && onePieceSelected) {
      removeItem(item, slot, "one_piece_already_selected");
      continue;
    }

    if (slot === "onePiece") {
      for (let index = selected.length - 1; index >= 0; index -= 1) {
        const selectedSlot = normalizeOutfitSlot(selected[index]);
        if (selectedSlot === "bottom" || selectedSlot === "top") {
          const [removedItem] = selected.splice(index, 1);
          if (removedItem) {
            selectedBySlot.set(selectedSlot, (selectedBySlot.get(selectedSlot) || []).filter((entry) => itemId(entry) !== itemId(removedItem)));
            if (itemId(removedItem)) seenIds.delete(itemId(removedItem));
            removeItem(removedItem, selectedSlot, "replaced_by_one_piece");
          }
        }
      }
    }

    const updatedExisting = selectedBySlot.get(slot) || [];
    const limit = slot === "accessory" ? 3 : slot === "unknown" ? Number.POSITIVE_INFINITY : 1;
    if (updatedExisting.length >= limit) {
      removeItem(item, slot, "duplicate_outfit_slot");
      continue;
    }

    selected.push(item);
    if (id) seenIds.add(id);
    selectedBySlot.set(slot, [...updatedExisting, item]);
  }

  return { items: selected, removed };
}

export function hasDuplicateExclusiveOutfitSlots(items: any[] = []) {
  return sanitizeOutfitItems(items).removed.some((entry) => entry.reason !== "duplicate_item");
}
