import { openai } from "@/lib/ai/openai";
import { logSafeError } from "@/lib/security/safe-log";
import type { AiTaggingInput, AiTaggingResult } from "@/types/ai-tagging";

export async function suggestWithOpenAiProvider(
  input: AiTaggingInput
): Promise<AiTaggingResult> {

  if (!process.env.OPENAI_API_KEY) {
    return fallback("AI tag suggestions are not configured yet.");
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Return ONLY JSON for clothing analysis. The user-selected category is "${input.selectedCategory || "not provided"}"${input.selectedCategoryLabel ? ` (${input.selectedCategoryLabel})` : ""}; use it unless the photo clearly contradicts it.

{
  "category":"",
  "subcategory":"",
  "color":"",
  "pattern":"",
  "fabric":"",
  "fit":"",
  "formality":[],
  "occasions":[],
  "weather":[],
  "confidence":0.9
}
`
            },
            {
              type: "input_image",
              image_url: input.imageUrl || "",
              detail: "auto"
            }
          ]
        }
      ]
    });

    const raw = response.output_text || "{}";

    let tags: any = {};
    try {
      tags = JSON.parse(raw);
    } catch {
      return fallback("Invalid AI response format");
    }

    return {
      ok: true,
      provider: "openai",
      confidence: tags.confidence ?? 0.75,
      aiTagStatus: "completed",
      suggestedTags: {
        category: input.selectedCategory || tags.category || "accessories",
        subcategory: input.selectedCategoryLabel || tags.subcategory || "",
        color: tags.color || "",
        pattern: tags.pattern || "",
        fabric: tags.fabric || "",
        fit: tags.fit || "",
        formality: Array.isArray(tags.formality) ? tags.formality : [],
        occasions: Array.isArray(tags.occasions) ? tags.occasions : [],
        weather: Array.isArray(tags.weather) ? tags.weather : [],
        confidence: tags.confidence || 0.75,
        needsReview: true
      }
    };

  } catch (error: any) {
    logSafeError("ai.openai-tagging", error);

    const msg =
      error?.status === 429 || error?.code === "insufficient_quota"
        ? "AI tag suggestions are temporarily unavailable."
        : "We could not analyze this image.";

    return fallback(msg);
  }
}

function fallback(message: string): AiTaggingResult {
  return {
    ok: false,
    provider: "openai",
    aiTagStatus: "failed",
    confidence: 0,
    safeMessage: message
  };
}
