export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { referenceRecommendationSchema, serializeReferenceFashionItem } from "@/lib/ai/reference-fashion-item";
import { getMemorySummary, serializeMemorySummary } from "@/lib/fashion-memory/fashion-memory";
import { isWeatherSensitiveMessage } from "@/lib/weather/weather-service";
import { resolveRecommendationWeatherAvailability } from "@/lib/weather/stylist-weather-state";
import { rateLimitRequest } from "@/lib/rate-limit";
import { buildReferenceOutfitRecommendations } from "@/lib/recommendation/reference-matching";
import { resolveCanonicalOccasionIntent } from "@/lib/recommendation/occasion-intent";
import { buildOutfitHistorySummary, getRecentOutfitHistory, recordOutfitHistory } from "@/lib/recommendation/history";
import { resolveOwnedRegenerationContext } from "@/lib/recommendation/regeneration-server";
import { logSafeError } from "@/lib/security/safe-log";
import { createOrReuseStylistOutfitRecommendation } from "@/lib/stylist/stylist-visualization";
import { getOrCreateStyleProfile, serializeStyleProfile } from "@/lib/style-profile/style-profile";
import { readJson, validateBody } from "@/lib/validation";
import { isObjectId, serializeWardrobeItem } from "@/lib/wardrobe";
import { getCompatibilityEdgesForItems } from "@/lib/wardrobe/compatibility/compatibility-graph";
import { ReferenceFashionItem } from "@/models/ReferenceFashionItem";
import { WardrobeItem } from "@/models/WardrobeItem";
import { hasAiProcessingConsent } from "@/lib/privacy/privacy-preferences";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-reference:recommend:${meta.ip}`, limit: 20, windowMs: 60 * 1000, operation: "stylist-reference-recommend" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!(await hasAiProcessingConsent(auth.user._id))) {
      return apiError("CONSENT_REQUIRED", "Allow AI processing in Profile → Privacy before creating a recommendation.");
    }
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "That photo is no longer available.");

    const parsed = validateBody(referenceRecommendationSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const referenceItem = await ReferenceFashionItem.findOne({ _id: id, userId: auth.user._id }).lean();
    if (!referenceItem) return apiError("NOT_FOUND", "That photo is no longer available.");
    if (referenceItem.status === "needs-selection") {
      return apiError("BAD_REQUEST", "Choose the item you want to style first.");
    }
    if (referenceItem.status !== "ready" || !referenceItem.usableForMatching) {
      return apiError("BAD_REQUEST", "I couldn’t identify a clear fashion item. Try another photo.");
    }

    const [wardrobe, styleProfile, memorySummary, outfitHistory] = await Promise.all([
      WardrobeItem.find({ userId: auth.user._id, archivedAt: null }).lean(),
      getOrCreateStyleProfile(auth.user._id),
      getMemorySummary(auth.user._id),
      getRecentOutfitHistory(auth.user._id, 60)
    ]);

    const compatibilityEdges = await getCompatibilityEdgesForItems({
      userId: String(auth.user._id),
      itemIds: wardrobe.map((item: any) => String(item._id)),
      minScore: 45
    });
    const regeneration = await resolveOwnedRegenerationContext({
      userId: String(auth.user._id),
      request: parsed.data.regeneration,
      wardrobeItems: wardrobe
    });

    const occasionIntent = resolveCanonicalOccasionIntent(parsed.data.occasion || parsed.data.message);
    const weatherAvailability = resolveRecommendationWeatherAvailability({
      requested: isWeatherSensitiveMessage(`${parsed.data.message || ""} ${parsed.data.occasion || ""}`),
      weatherContext: parsed.data.weatherContext
    });
    const recommendations = buildReferenceOutfitRecommendations({
      referenceItem,
      wardrobeItems: wardrobe,
      message: parsed.data.message,
      occasionName: occasionIntent.label,
      weatherContext: parsed.data.weatherContext,
      weatherAvailability,
      styleProfile: serializeStyleProfile(styleProfile),
      memorySummary: serializeMemorySummary(memorySummary),
      outfitHistorySummary: buildOutfitHistorySummary(outfitHistory),
      compatibilityEdges,
      recommendationMode: regeneration ? "something_different" : "photo_match",
      regeneration,
      limit: 3
    });

    const persistedRecommendations = await Promise.all(
      recommendations.map((recommendation) => createOrReuseStylistOutfitRecommendation(
        String(auth.user._id),
        recommendation,
        {
          requestText: parsed.data.message || `Style this ${referenceItem.category || "fashion item"} with my closet.`,
          source: "stylist_chat"
        }
      ))
    );

    const primaryIndex = recommendations.findIndex((recommendation) => recommendation.items.length > 0);
    const primary = primaryIndex >= 0 ? recommendations[primaryIndex] : null;
    const persistedPrimary = primaryIndex >= 0 ? persistedRecommendations[primaryIndex] : null;
    if (primary) {
      const itemIds = (persistedPrimary?.items || primary.items).map((item: any) => item._id).filter(Boolean);
      const historyWrites: Array<Promise<unknown>> = [
        WardrobeItem.updateMany(
          { _id: { $in: itemIds }, userId: auth.user._id },
          { $set: { lastRecommendedAt: new Date() }, $inc: { recommendationCount: 1 } }
        ),
        recordOutfitHistory({
          userId: auth.user._id,
          outfitId: persistedPrimary?.outfitRecommendationId,
          itemIds,
          eventType: "generated",
          source: "stylist_chat",
          recommendationMode: primary.recommendationMode || "photo_match",
          occasion: primary.occasion,
          context: {
            referenceItemId: String(referenceItem._id),
            anchorCategory: referenceItem.category || "",
            weatherContext: parsed.data.weatherContext || ""
          },
          scoreBreakdown: primary.scoreBreakdown,
          similarityMetadata: primary.similarityMetadata
        })
      ];
      if (regeneration?.previousRecommendationId) {
        historyWrites.push(recordOutfitHistory({
          userId: auth.user._id,
          outfitId: regeneration.previousRecommendationId,
          itemIds: regeneration.previousItemIds,
          eventType: "swapped",
          source: "stylist_chat",
          recommendationMode: "something_different",
          occasion: primary.occasion,
          context: {
            referenceItemId: String(referenceItem._id)
          }
        }));
      }
      await Promise.allSettled(historyWrites);
    }

    return apiSuccess({
      referenceItem: serializeReferenceFashionItem(referenceItem),
      recommendations: recommendations.map((recommendation, index) => persistedRecommendations[index]?.serializedOutfit || ({
        ...recommendation,
        items: recommendation.items.map(serializeWardrobeItem)
      }))
    });
  } catch (error) {
    logSafeError("stylist.reference.recommendations", error);
    return apiError("INTERNAL_ERROR", "I couldn’t find matching closet items right now.");
  }
}
