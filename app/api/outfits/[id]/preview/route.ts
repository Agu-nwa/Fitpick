export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { WardrobeItem } from "@/models/WardrobeItem";
import { openai } from "@/lib/ai/openai";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return apiError(
        "INTERNAL_ERROR",
        "OpenAI API key is missing."
      );
    }

    const auth = await requireUser();

    if (!auth.ok) {
      return auth.response;
    }

    const outfit =
      await OutfitRecommendation.findOne({
        _id: context.params.id,
        userId: auth.user._id
      });

    if (!outfit) {
      return apiError(
        "NOT_FOUND",
        "Outfit was not found."
      );
    }

    const items =
      await WardrobeItem.find({
        _id: { $in: outfit.itemIds }
      }).lean();

    if (!items.length) {
      return apiError(
        "BAD_REQUEST",
        "No wardrobe items found."
      );
    }

    const clothingDescription = items
      .map(
        (item) =>
          `
Category: ${item.category || ""}
Name: ${item.name || ""}
Color: ${item.color || ""}
Pattern: ${item.pattern || ""}
Fabric: ${item.fabric || ""}
Style: ${item.subcategory || ""}
`
      )
      .join("\n");

    const prompt = `
Create a highly realistic editorial fashion photograph.

Model outfit:

${clothingDescription}

Occasion:
${outfit.occasion || "Casual outing"}

Requirements:

- full body shot
- realistic human model
- premium fashion photography
- modern styling
- editorial magazine quality
- professional studio lighting
- stylish pose
- photorealistic
- detailed textures
- luxury fashion aesthetic
- natural skin tones
- centered composition
- no text
- no watermark
`;

    const image = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1536"
    });

    const imageBase64 =
      image.data?.[0]?.b64_json;

    if (!imageBase64) {
      return apiError(
        "INTERNAL_ERROR",
        "Image generation failed."
      );
    }

    return apiSuccess({
      previewUrl:
        `data:image/png;base64,${imageBase64}`,

      generatedAt:
        new Date().toISOString(),

      confidence: 0.9
    });
  } catch (error) {
    console.error(
      "FitPick preview generation error:",
      error
    );

    return apiError(
      "INTERNAL_ERROR",
      "Unable to generate outfit preview."
    );
  }
}