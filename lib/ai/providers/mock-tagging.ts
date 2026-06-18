import type { AiTaggingInput, AiTaggingResult } from "@/types/ai-tagging";

function inferFromFilename(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.includes("shoe") || lower.includes("sneaker") || lower.includes("loafer")) return { category: "shoes" as const, subcategory: "Shoes" };
  if (lower.includes("trouser") || lower.includes("pants") || lower.includes("jean")) return { category: "bottoms" as const, subcategory: "Trousers" };
  if (lower.includes("dress")) return { category: "dresses" as const, subcategory: "Dress" };
  if (lower.includes("jacket") || lower.includes("coat")) return { category: "outerwear" as const, subcategory: "Jacket" };
  if (lower.includes("bag") || lower.includes("tote")) return { category: "bags" as const, subcategory: "Bag" };
  return { category: "tops" as const, subcategory: "Shirt" };
}

function inferColor(filename: string) {
  const lower = filename.toLowerCase();
  const colors = ["white", "black", "navy", "blue", "brown", "cream", "olive", "green", "red", "pink", "gray", "grey"];
  const match = colors.find((color) => lower.includes(color));
  if (!match) return "Neutral";
  return match === "grey" ? "Gray" : match.charAt(0).toUpperCase() + match.slice(1);
}

export async function suggestWithMockProvider(input: AiTaggingInput): Promise<AiTaggingResult> {
  const inferred = inferFromFilename(input.filename);
  const color = inferColor(input.filename);
  const isShoe = inferred.category === "shoes";

  return {
    ok: true,
    provider: "mock",
    aiTagStatus: "needs-review",
    confidence: 0.74,
    suggestedTags: {
      name: `${color} ${inferred.subcategory.toLowerCase()}`,
      category: inferred.category,
      subcategory: inferred.subcategory,
      color,
      pattern: "Plain",
      fabric: isShoe ? "Leather" : "",
      fit: "",
      formality: isShoe ? ["smart casual", "business"] : ["balanced", "smart casual"],
      occasions: isShoe ? ["work", "church", "date"] : ["work", "casual", "business"],
      weather: isShoe ? ["dry"] : ["indoor", "hot"],
      condition: "missing-tags",
      confidence: 0.74,
      needsReview: true
    }
  };
}
