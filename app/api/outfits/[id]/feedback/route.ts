export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { StylePreference } from "@/models/StylePreference";
import { WardrobeItem } from "@/models/WardrobeItem";
import { learnFromFeedback } from "@/lib/recommendation/learning";
import { recordOutfitHistory } from "@/lib/recommendation/history";
import { logRecommendationOutcome } from "@/lib/recommendation/quality";
import { readJson, validateBody } from "@/lib/validation";
import { isObjectId } from "@/lib/wardrobe";
import { z } from "zod";

const schema = z.object({
  liked: z.boolean(),
  reason: z.string().trim().max(240).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  feedbackTags: z.array(z.enum(["great-combination", "wrong-item", "wrong-color", "wrong-fit", "too-casual", "too-formal", "uncomfortable", "weather-issue", "already-worn", "not-my-style", "tryon-inaccurate"])).max(10).optional(),
  itemFeedback: z.array(z.object({
    itemId: z.string().regex(/^[a-f\d]{24}$/i),
    liked: z.boolean(),
    reason: z.string().trim().max(120).optional()
  })).max(12).optional()
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `outfit-feedback:${meta.ip}`, limit: 40, windowMs: 60 * 1000, operation: "outfit-feedback" });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();

    if (!auth.ok) {
      return auth.response;
    }

    const parsed = validateBody(
      schema,
      await readJson(request)
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    if (!isObjectId(id)) {
      return apiError("NOT_FOUND", "Outfit not found.");
    }

    const outfit =
      await OutfitRecommendation.findOne({
        _id: id,
        userId: auth.user._id
      });

    if (!outfit) {
      return apiError(
        "NOT_FOUND",
        "Outfit not found."
      );
    }

    const items =
      await WardrobeItem.find({
        _id: {
          $in: outfit.itemIds
        },
        userId: auth.user._id
      });

    const ownedIds = new Set(items.map((item) => String(item._id)));
    if ((parsed.data.itemFeedback || []).some((entry) => !ownedIds.has(entry.itemId))) {
      return apiError("BAD_REQUEST", "Feedback contains an item outside this outfit.");
    }

    const preferences =
      await StylePreference.findOne({
        userId: auth.user._id
      });

    // Legacy preference promotion is intentionally limited to explicit positive
    // item feedback. Whole-outfit approval alone must not mark every attribute as
    // a permanent favorite.
    const explicitlyLikedIds = new Set((parsed.data.itemFeedback || []).filter((entry) => entry.liked).map((entry) => entry.itemId));
    if (preferences && explicitlyLikedIds.size) {
      const updated =
        learnFromFeedback({
          liked: true,
          reason: parsed.data.reason,
          outfitItems: items.filter((item) => explicitlyLikedIds.has(String(item._id))),
          preferences: preferences?.toObject?.() ?? JSON.parse(JSON.stringify(preferences))
        });

      // preferences' exact fields may differ from the learning result shape.
      // Use a typed escape to assign whatever updated fields exist.
      const prefAny = preferences as any;

      if (updated.favoriteColors) {
        prefAny.favoriteColors = updated.favoriteColors;
      }

      if (updated.favoriteCategories) {
        prefAny.favoriteCategories = updated.favoriteCategories;
      }

      await preferences.save();
    }

    await recordOutfitHistory({
      userId: auth.user._id,
      outfitId: outfit._id,
      itemIds: outfit.itemIds,
      eventType: parsed.data.liked ? "accepted" : "rejected",
      source: outfit.source === "stylist_chat" ? "stylist_chat" : "outfit_page",
      recommendationMode: (outfit as any).recommendationMode || (outfit as any).reasoningMetadata?.recommendationMode || "todays_best",
      occasion: outfit.occasion,
      feedbackReason: parsed.data.reason || (parsed.data.feedbackTags || []).join(", "),
      feedbackRating: parsed.data.rating || (parsed.data.liked ? 5 : 1),
      itemFeedback: parsed.data.itemFeedback
    });

    logRecommendationOutcome({
      recommendationId: String(outfit._id),
      event: parsed.data.liked ? "accepted" : "rejected",
      confidenceScore: outfit.confidenceScore,
      completenessStatus: outfit.completenessStatus,
      footwearIncluded: outfit.footwearIncluded,
      explicitItemFeedbackCount: parsed.data.itemFeedback?.length || 0
    });

    return apiSuccess({
      message:
        "Feedback saved successfully."
    });
  } catch (error) {
    logSafeError("outfit.feedback", error);

    return apiError(
      "INTERNAL_ERROR",
      "Unable to save feedback."
    );
  }
}
