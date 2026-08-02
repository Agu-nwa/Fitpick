export function outfitItemSignature(itemIds: Array<{ toString(): string } | string> = []) {
  return Array.from(new Set(itemIds.map(String).filter(Boolean))).sort().join("|");
}
