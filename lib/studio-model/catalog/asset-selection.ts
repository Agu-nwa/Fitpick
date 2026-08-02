import type { StudioModelAppearance } from "../appearance-taxonomy";

const toneRank = (value: string) => Number(value.replace(/\D/g, "")) || 5;
const lengthRank: Record<string, number> = { shaved: 0, short: 1, medium: 2, long: 3 };
export function fallbackDistance(asset: any, appearance: StudioModelAppearance) {
  if (asset.genderPresentation !== appearance.gender || asset.bodyType !== appearance.bodyType) return Number.POSITIVE_INFINITY;
  return Math.abs(toneRank(asset.skinTone) - toneRank(appearance.skinTone)) * 20
    + (asset.hairTexture === appearance.hairTexture ? 0 : 8)
    + Math.abs((lengthRank[asset.hairLength] ?? 2) - (lengthRank[appearance.hairLength] ?? 2)) * 3
    + (asset.hairColor === appearance.hairColor ? 0 : 2)
    + (asset.hairStyle === appearance.hairStyle ? 0 : 1);
}
export function selectBestStudioModelFallback<T>(assets: T[], appearance: StudioModelAppearance): T | null {
  return assets.map((asset) => ({ asset, distance: fallbackDistance(asset, appearance) })).filter((item) => Number.isFinite(item.distance)).sort((a, b) => a.distance - b.distance)[0]?.asset || null;
}

