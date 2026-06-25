export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import OpenAI from "openai";

import { apiSuccess, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { WardrobeItem } from "@/models/WardrobeItem";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();

    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();

    const message = body.message;

    if (!message) {
      return apiError(
        "BAD_REQUEST",
        "Message is required."
      );
    }

    const wardrobe = await WardrobeItem.find({
      userId: auth.user._id
    }).lean();

    const wardrobeSummary = wardrobe
      .slice(0, 50)
      .map(
        (item: any) =>
          `${item.category} | ${item.color} | ${
            item.subcategory || ""
          }`
      )
      .join("\n");

    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",

        input: `
You are FitPick AI Stylist.

User wardrobe:

${wardrobeSummary}

User question:

${message}

Provide short styling advice.
Recommend specific wardrobe combinations whenever possible.
`
      });

    return apiSuccess({
      reply: response.output_text
    });
  } catch (error) {
    console.error(error);

    return apiError(
      "INTERNAL_ERROR",
      "Unable to contact stylist."
    );
  }
}