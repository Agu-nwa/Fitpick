import type { AiTaggingInput, AiTaggingResult } from "@/types/ai-tagging";

export async function suggestWithGeminiProvider(_input: AiTaggingInput): Promise<AiTaggingResult> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      ok: false,
      provider: "gemini",
      aiTagStatus: "failed",
      safeMessage: "AI tag suggestions are not configured yet."
    };
  }

  return {
    ok: false,
    provider: "gemini",
    aiTagStatus: "failed",
    safeMessage: "AI tag suggestions are not available yet."
  };
}
