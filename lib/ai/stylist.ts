import { openai } from "@/lib/ai/openai";

export async function askStylist({
  message,
  wardrobeSummary
}: {
  message: string;
  wardrobeSummary: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      ok: false,
      reply: "AI stylist is unavailable."
    };
  }

  try {
    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",

        input: `
You are FitPick AI Stylist.

User wardrobe:

${wardrobeSummary}

User question:

${message}

Rules:
- Recommend outfits only from available wardrobe.
- Give concise advice.
- Mention colors and occasions.
- Keep response under 120 words.
`
      });

    return {
      ok: true,
      reply: response.output_text
    };

  } catch {
    return {
      ok: false,
      reply:
        "I couldn't generate styling advice."
    };
  }
}