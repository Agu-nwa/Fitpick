export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { referenceRecommendationSchema, serializeReferenceFashionItem } from "@/lib/ai/reference-fashion-item";
import { getMemorySummary, serializeMemorySummary } from "@/lib/fashion-memory/fashion-memory";
import { rateLimitRequest } from "@/lib/rate-limit";
import { buildReferenceOutfitRecommendations } from "@/lib/recommendation/reference-matching";
import { buildOutfitHistorySummary, getRecentOutfitHistory } from "@/lib/recommendation/history";
import { logSafeError } from "@/lib/security/safe-log";
import { getOrCreateStyleProfile, serializeStyleProfile } from "@/lib/style-profile/style-profile";
import { readJson, validateBody } from "@/lib/validation";
import { isObjectId, serializeWardrobeItem } from "@/lib/wardrobe";
import { ReferenceFashionItem } from "@/models/ReferenceFashionItem";
import { WardrobeItem } from "@/models/WardrobeItem";

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

    const recommendations = buildReferenceOutfitRecommendations({
      referenceItem,
      wardrobeItems: wardrobe,
      message: parsed.data.message,
      occasionName: parsed.data.occasion || parsed.data.message,
      weatherContext: parsed.data.weatherContext,
      styleProfile: serializeStyleProfile(styleProfile),
      memorySummary: serializeMemorySummary(memorySummary),
      outfitHistorySummary: buildOutfitHistorySummary(outfitHistory),
      limit: 3
    });

    return apiSuccess({
      referenceItem: serializeReferenceFashionItem(referenceItem),
      recommendations: recommendations.map((recommendation) => ({
        ...recommendation,
        items: recommendation.items.map(serializeWardrobeItem)
      }))
    });
  } catch (error) {
    logSafeError("stylist.reference.recommendations", error);
    return apiError("INTERNAL_ERROR", "I couldn’t find matching closet items right now.");
  }
}
