import type { AiTaggingInput, AiTaggingResult } from "@/types/ai-tagging";

export async function suggestWithCloudinaryProvider(input: AiTaggingInput): Promise<AiTaggingResult> {
  const existing = input.suggestedTags || {};
  const category = typeof existing.category === "string" ? existing.category : undefined;
  const color = typeof existing.color === "string" ? existing.color : undefined;

  if (!input.storageKey && !input.imageUrl) {
    return {
      ok: false,
      provider: "cloudinary",
      aiTagStatus: "failed",
      safeMessage: "We could not suggest tags for this item. You can add them manually."
    };
  }

  return {
    ok: true,
    provider: "cloudinary",
    aiTagStatus: "needs-review",
    confidence: category || color ? 0.68 : 0.54,
    suggestedTags: {
      name: input.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "),
      category: category === "shoes" || category === "bottoms" || category === "dresses" || category === "native" || category === "outerwear" || category === "bags" || category === "accessories" || category === "tops" ? category : "tops",
      subcategory: "Clothing item",
      color: color || "Neutral",
      pattern: "Plain",
      fabric: "",
      fit: "",
      formality: ["balanced"],
      occasions: ["casual"],
      weather: ["dry"],
      condition: "missing-tags",
      confidence: category || color ? 0.68 : 0.54,
      needsReview: true
    }
  };
}
