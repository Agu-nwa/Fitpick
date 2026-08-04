import { normalizeOutfitSlot } from "@/lib/recommendation/outfit-slots";

export type TryOnRoleCapability = "strong" | "partial" | "unsupported";
export type TryOnVisualRole = "upperBody" | "lowerBody" | "onePiece" | "outerwear" | "footwear" | "bags" | "watches" | "jewellery" | "eyewear" | "womensHair";
export type PreviewFidelityLevel = "full" | "partial" | "core_only";

export interface TryOnProviderCapabilities {
  upperBody: TryOnRoleCapability;
  lowerBody: TryOnRoleCapability;
  onePiece: TryOnRoleCapability;
  outerwear: TryOnRoleCapability;
  footwear: TryOnRoleCapability;
  bags: TryOnRoleCapability;
  watches: TryOnRoleCapability;
  jewellery: TryOnRoleCapability;
  eyewear: TryOnRoleCapability;
  womensHair: TryOnRoleCapability;
}

const CAPABILITIES: Record<string, TryOnProviderCapabilities> = {
  fashn: { upperBody: "strong", lowerBody: "strong", onePiece: "strong", outerwear: "partial", footwear: "partial", bags: "unsupported", watches: "unsupported", jewellery: "unsupported", eyewear: "unsupported", womensHair: "unsupported" },
  custom: { upperBody: "strong", lowerBody: "strong", onePiece: "strong", outerwear: "partial", footwear: "partial", bags: "partial", watches: "partial", jewellery: "partial", eyewear: "partial", womensHair: "unsupported" },
  internal_preview: { upperBody: "partial", lowerBody: "partial", onePiece: "partial", outerwear: "partial", footwear: "partial", bags: "partial", watches: "partial", jewellery: "partial", eyewear: "partial", womensHair: "partial" },
  none: { upperBody: "unsupported", lowerBody: "unsupported", onePiece: "unsupported", outerwear: "unsupported", footwear: "unsupported", bags: "unsupported", watches: "unsupported", jewellery: "unsupported", eyewear: "unsupported", womensHair: "unsupported" }
};

function itemText(item: any) {
  return `${item?.name || ""} ${item?.category || ""} ${item?.subcategory || ""} ${item?.canonicalSubtype || ""} ${item?.stylingRole || ""}`.toLowerCase();
}

export function tryOnVisualRoleForItem(item: any): TryOnVisualRole | null {
  const slot = normalizeOutfitSlot(item);
  const text = itemText(item);
  if (item?.category === "womens_hair" || /\b(wig|hair extension|hairpiece|braiding hair)\b/.test(text)) return "womensHair";
  if (/\b(watch|smartwatch)\b/.test(text)) return "watches";
  if (/\b(necklace|earring|bracelet|bangle|ring|jewel|chain|anklet|brooch)\b/.test(text)) return "jewellery";
  if (/\b(sunglasses|eyewear|eyeglasses|glasses)\b/.test(text)) return "eyewear";
  if (slot === "top") return "upperBody";
  if (slot === "bottom") return "lowerBody";
  if (slot === "onePiece") return "onePiece";
  if (slot === "outerwear") return "outerwear";
  if (slot === "shoes") return "footwear";
  if (slot === "bag") return "bags";
  return null;
}

export function getTryOnProviderCapabilities(provider: string): TryOnProviderCapabilities {
  return CAPABILITIES[provider] || CAPABILITIES.internal_preview;
}

export function buildTryOnFidelity(provider: string, items: any[]) {
  const capabilities = getTryOnProviderCapabilities(provider);
  const requestedRoles = Array.from(new Set(items.map(tryOnVisualRoleForItem).filter(Boolean))) as TryOnVisualRole[];
  const providerSupportedRoles = requestedRoles.filter((role) => capabilities[role] === "strong");
  const partiallySupportedRoles = requestedRoles.filter((role) => capabilities[role] === "partial");
  const unsupportedRoles = requestedRoles.filter((role) => capabilities[role] === "unsupported");
  const coreRoles: TryOnVisualRole[] = ["upperBody", "lowerBody", "onePiece", "outerwear"];
  const coreSupported = requestedRoles.filter((role) => coreRoles.includes(role)).every((role) => capabilities[role] !== "unsupported");
  const previewFidelityLevel: PreviewFidelityLevel = unsupportedRoles.length
    ? coreSupported ? "core_only" : "partial"
    : partiallySupportedRoles.length ? "partial" : "full";
  return { requestedRoles, providerSupportedRoles, partiallySupportedRoles, unsupportedRoles, previewFidelityLevel };
}

const PRIORITY: Record<TryOnVisualRole, number> = { onePiece: 10, upperBody: 20, lowerBody: 30, outerwear: 40, footwear: 50, bags: 60, watches: 70, jewellery: 71, eyewear: 72, womensHair: 73 };

export function prepareTryOnItems(input: { provider: string; items: any[]; referenceItemIds?: string[]; maximumItems: number }) {
  const references = new Set((input.referenceItemIds || []).map(String));
  const capabilities = getTryOnProviderCapabilities(input.provider);
  const ranked = input.items.map((item, originalIndex) => {
    const role = tryOnVisualRoleForItem(item);
    const id = String(item?._id || item?.id || "");
    return { item, id, role, originalIndex, reference: references.has(id), capability: role ? capabilities[role] : "unsupported" as TryOnRoleCapability };
  }).sort((a, b) => Number(b.reference) - Number(a.reference) || (a.role ? PRIORITY[a.role] : 999) - (b.role ? PRIORITY[b.role] : 999) || a.originalIndex - b.originalIndex);
  const eligible = ranked.filter((entry) => entry.capability !== "unsupported");
  const sent = eligible.slice(0, Math.max(1, input.maximumItems));
  const sentIds = new Set(sent.map((entry) => entry.id));
  const recommendationOnly = ranked.filter((entry) => !sentIds.has(entry.id));
  return {
    sentItems: sent.map((entry) => entry.item),
    sentItemIds: sent.map((entry) => entry.id).filter(Boolean),
    recommendationOnlyItemIds: recommendationOnly.map((entry) => entry.id).filter(Boolean),
    omittedReasons: recommendationOnly.map((entry) => ({ itemId: entry.id, role: entry.role, reason: entry.capability === "unsupported" ? "provider_role_unsupported" : "provider_item_limit" })),
    fidelity: buildTryOnFidelity(input.provider, input.items)
  };
}
