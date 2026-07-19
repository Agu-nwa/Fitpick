import { aiTaggingResultSchema, aiSuggestedWardrobeTagsSchema } from "@/schemas/ai-tagging.schema";
import { analyzeWardrobeImages } from "@/lib/ai/wardrobe-analysis";
import type { AiSuggestedWardrobeTags, AiTaggingInput, AiTaggingProvider, AiTaggingResult } from "@/types/ai-tagging";

const safeFailedResult: AiTaggingResult = {
  ok: false,
  provider: "openai",
  aiTagStatus: "failed",
  safeMessage: "AI tag suggestions are not configured yet. You can add details manually."
};

export function getAiTaggingProvider(): AiTaggingProvider {
  return "openai";
}

export function normalizeSuggestedTags(result: AiTaggingResult): AiTaggingResult {
  if (!result.suggestedTags) return result;
  const confidence = Math.min(1, Math.max(0, result.suggestedTags.confidence ?? result.confidence ?? 0));
  return {
    ...result,
    confidence,
    aiTagStatus: confidence >= 0.8 ? "completed" : "needs-review",
    suggestedTags: {
      ...result.suggestedTags,
      confidence,
      needsReview: true
    }
  };
}

export function validateSuggestedTags(result: AiTaggingResult): AiTaggingResult {
  const parsed = aiTaggingResultSchema.safeParse(result);
  if (!parsed.success) return { ...safeFailedResult, provider: result.provider };
  if (!parsed.data.suggestedTags) return parsed.data;

  const tags = aiSuggestedWardrobeTagsSchema.safeParse(parsed.data.suggestedTags);
  if (!tags.success) return { ...safeFailedResult, provider: result.provider };
  return { ...parsed.data, suggestedTags: tags.data as AiSuggestedWardrobeTags };
}

export async function suggestWardrobeTags(input: AiTaggingInput): Promise<AiTaggingResult> {
  const provider = getAiTaggingProvider();
  try {
    const result = await analyzeWardrobeImages(input);

    return validateSuggestedTags(normalizeSuggestedTags(result));
  } catch {
    return { ...safeFailedResult, provider };
  }
}
