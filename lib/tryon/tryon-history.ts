import { getPublicStorageUrl } from "@/lib/storage/url";

export type TryOnHistoryItem = {
  generationId: string;
  outfitId: string;
  previewUrl: string;
  completedAt: string | null;
};

function isoDate(value: unknown) {
  if (!value) return null;
  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function serializeTryOnHistoryItem(generation: any): TryOnHistoryItem | null {
  if (!generation || generation.status !== "completed") return null;

  const storageUrl = generation.storageKey ? getPublicStorageUrl(String(generation.storageKey)) : "";
  const previewUrl = storageUrl || String(generation.previewUrl || "").trim();
  const generationId = String(generation.generationId || "").trim();
  const outfitId = generation.outfitId ? String(generation.outfitId) : "";

  if (!generationId || !outfitId || !previewUrl) return null;

  return {
    generationId,
    outfitId,
    previewUrl,
    completedAt: isoDate(generation.completedAt || generation.updatedAt || generation.createdAt)
  };
}

export function buildTryOnHistory(generations: any[], limit = 60) {
  const seenImages = new Set<string>();
  const history: TryOnHistoryItem[] = [];

  for (const generation of generations) {
    const item = serializeTryOnHistoryItem(generation);
    if (!item || seenImages.has(item.previewUrl)) continue;
    seenImages.add(item.previewUrl);
    history.push(item);
    if (history.length >= limit) break;
  }

  return history;
}
