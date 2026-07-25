const neutralColors = new Set(["black", "white", "grey", "gray", "navy", "beige", "cream", "brown", "tan"]);
const earthColors = new Set(["brown", "tan", "olive", "khaki", "cream", "beige"]);
const coolColors = new Set(["blue", "navy", "green", "teal", "purple"]);
const warmColors = new Set(["red", "orange", "yellow", "pink", "maroon"]);
const neutralColorList = Array.from(neutralColors);
const earthColorList = Array.from(earthColors);
const coolColorList = Array.from(coolColors);
const warmColorList = Array.from(warmColors);

function colorFor(item: any) {
  return String(
    item?.color ||
    item?.primaryColor ||
    item?.verifiedMetadata?.primaryColor?.value ||
    item?.aiAnalysis?.fields?.primaryColor?.value ||
    item?.pattern ||
    item?.verifiedMetadata?.pattern?.value ||
    ""
  );
}

export function colorGroup(color = "") {
  const normalized = color.toLowerCase();
  if (neutralColorList.some((entry) => normalized.includes(entry))) return "neutral";
  if (earthColorList.some((entry) => normalized.includes(entry))) return "earth";
  if (coolColorList.some((entry) => normalized.includes(entry))) return "cool";
  if (warmColorList.some((entry) => normalized.includes(entry))) return "warm";
  if (normalized.includes("print") || normalized.includes("pattern")) return "pattern";
  return "other";
}

export function colorCompatibilityScore(items: Array<{ color?: string; pattern?: string }>) {
  const groups = items.map((item) => colorGroup(colorFor(item)));
  const neutralCount = groups.filter((group) => group === "neutral" || group === "earth").length;
  const uniqueGroups = new Set(groups.filter((group) => group !== "other"));

  if (items.length <= 1) return 8;
  if (neutralCount >= Math.max(1, items.length - 1)) return 18;
  if (neutralCount >= 1 && uniqueGroups.size <= 3) return 16;
  if (uniqueGroups.has("cool") && uniqueGroups.has("warm") && neutralCount >= 1) return 14;
  if (uniqueGroups.size <= 2) return 14;
  if (groups.includes("pattern") && neutralCount >= 1) return 13;
  if (uniqueGroups.size >= 4 && neutralCount === 0) return 4;
  return 8;
}

export function colorNote(items: Array<{ color?: string; pattern?: string }>) {
  const score = colorCompatibilityScore(items);
  if (score >= 18) return "Neutral-compatible colors keep the outfit easy to wear.";
  if (score >= 13) return "Colors are balanced for a wearable outfit.";
  return "Color mix may need a quick review before wearing.";
}
