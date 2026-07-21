export const dynamic = "force-dynamic";

import {
  getWeatherForecast
} from "@/lib/weather/weather-service";
import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import {
  buildRecommendation,
  serializeOutfit
} from "@/lib/recommendation/engine";
import { buildOutfitHistorySummary, getRecentOutfitHistory, recordOutfitHistory } from "@/lib/recommendation/history";
import { incrementDailyPickUsage } from "@/lib/usage-limits";
import {
  readJson,
  validateBody
} from "@/lib/validation";

import { Occasion } from "@/models/Occasion";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { StylePreference } from "@/models/StylePreference";
import { WardrobeItem } from "@/models/WardrobeItem";
import { WornLook } from "@/models/WornLook";
import { getOrCreateStyleProfile, serializeStyleProfile } from "@/lib/style-profile/style-profile";
import { getMemorySummary, serializeMemorySummary } from "@/lib/fashion-memory/fashion-memory";

import { outfitRecommendationRequestSchema }
  from "@/schemas/outfit.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);

  const limited = rateLimitRequest({
    key: `outfit-recommend:${meta.ip}`,
    limit: 20,
    windowMs: 60 * 1000
  });

  if (limited) return limited;

  try {
    const auth = await requireUser();

    if (!auth.ok) return auth.response;

    const parsed = validateBody(
      outfitRecommendationRequestSchema,
      await readJson(request)
    );

    if (!parsed.ok) return parsed.response;

    const [
      preferences,
      styleProfile,
      memorySummary,
      outfitHistory,
      wardrobeItems,
      wornLooks,
      occasion
    ] = await Promise.all([
      StylePreference.findOne({
        userId: auth.user._id
      }).lean(),

      getOrCreateStyleProfile(auth.user._id),

      getMemorySummary(auth.user._id),

      getRecentOutfitHistory(auth.user._id, 60),

      WardrobeItem.find({
        userId: auth.user._id,
        archivedAt: null
      }).lean(),

      WornLook.find({
        userId: auth.user._id
      })
        .sort({ wornAt: -1 })
        .limit(25)
        .lean(),

      parsed.data.occasionId
        ? Occasion.findOne({
          _id: parsed.data.occasionId,
          $or: [
            { isGlobal: true },
            { userId: auth.user._id }
          ]
        }).lean()
        : null
    ]);

    if (!wardrobeItems.length) {
      return apiError(
        "BAD_REQUEST",
        "Add wardrobe items before requesting an outfit."
      );
    }

    let weatherForecast = null;
    const savedLatitude = typeof auth.user.weatherLatitude === "number" ? auth.user.weatherLatitude : undefined;
    const savedLongitude = typeof auth.user.weatherLongitude === "number" ? auth.user.weatherLongitude : undefined;

    if (
      (typeof parsed.data.latitude === "number" && typeof parsed.data.longitude === "number") ||
      (typeof savedLatitude === "number" && typeof savedLongitude === "number") ||
      parsed.data.weatherLocation ||
      auth.user.weatherLocationName
    ) {
      try {
        weatherForecast = await getWeatherForecast({
          latitude: typeof parsed.data.latitude === "number" ? parsed.data.latitude : savedLatitude,
          longitude: typeof parsed.data.longitude === "number" ? parsed.data.longitude : savedLongitude,
          city: typeof parsed.data.latitude === "number" && typeof parsed.data.longitude === "number" ? undefined : parsed.data.weatherLocation || auth.user.weatherLocationName || undefined,
          days: 3
        });
      } catch (error) {
        logSafeError("outfit.recommend.weather", error);
      }
    }


    const occasionName =
      parsed.data.customOccasion?.name ||
      parsed.data.occasionName ||
      occasion?.name ||
      "Today";
    const outfitHistorySummary = buildOutfitHistorySummary(outfitHistory);

    const built = buildRecommendation({
      occasionName,
      occasionGroup:
        parsed.data.customOccasion?.group ||
        occasion?.group,

      weather: weatherForecast?.current || null,

      formality:
        parsed.data.formality ||
        parsed.data.customOccasion?.formality ||
        occasion?.formality ||
        preferences?.formality,

      weatherContext:
        weatherForecast
          ? weatherForecast.summary
          : parsed.data.weatherContext || "",

      allowNeedsCare:
        parsed.data.allowNeedsCare,

      styleDirection:
        parsed.data.styleDirection,

      preferences,
      styleProfile: serializeStyleProfile(styleProfile),
      memorySummary: serializeMemorySummary(memorySummary),
      outfitHistorySummary,
      recommendationMode: parsed.data.recommendationMode,
      wardrobeItems,
      wornLooks
    });

    const recommendation =
      await OutfitRecommendation.create({
        userId: auth.user._id,

        occasionId: occasion?._id,

        title: built.title,

        occasion: built.occasion,

        itemIds: built.items.map(
          (item: any) => item._id
        ),

        confidence: built.confidence,

        reasonChips:
          built.reasonChips,

        summary: built.summary,

        weatherContext:
          built.weatherContext,

        repetitionNote:
          built.repetitionNote,

        careNote: built.careNote,

        colorNote:
          built.colorNote,

        occasionFit:
          built.occasionFit,

        whyItWorks:
          built.whyItWorks,

        materialNote:
          built.materialNote,

        silhouetteNote:
          built.silhouetteNote,

        improvementNote:
          built.improvementNote,

        addLater:
          built.addLater,

        stylingTips:
          built.stylingTips,

        recommendationMode: built.recommendationMode,

        styleIntent: built.styleIntent,

        freshnessCue: built.freshnessCue,

        wardrobeReadiness: built.wardrobeReadiness,

        gapInsights: built.gapInsights,

        scoreBreakdown: built.scoreBreakdown,

        similarityMetadata: built.similarityMetadata,

        candidateCount: built.candidateCount,

        diverseCandidateCount: built.diverseCandidateCount,

        alternatives: built.alternatives,

        confidenceScore:
          built.confidenceScore,

        completenessStatus:
          built.completenessStatus,

        missingCategories:
          built.missingCategories,

        completenessWarnings:
          built.completenessWarnings,

        footwearIncluded:
          built.footwearIncluded,

        swapGroups:
          built.swapGroups,

        source: "outfit_page"
      });

    if (built.items.length) {
      await Promise.all([
        WardrobeItem.updateMany(
          { _id: { $in: built.items.map((item: any) => item._id) }, userId: auth.user._id },
          {
            $set: { lastRecommendedAt: new Date() },
            $inc: { recommendationCount: 1 }
          }
        ),
        recordOutfitHistory({
          userId: auth.user._id,
          outfitId: recommendation._id,
          itemIds: built.items.map((item: any) => item._id),
          eventType: "generated",
          source: "outfit_page",
          recommendationMode: built.recommendationMode,
          occasion: built.occasion,
          context: {
            occasionName,
            occasionGroup: parsed.data.customOccasion?.group || occasion?.group || null,
            weatherContext: built.weatherContext || "",
            formality: parsed.data.formality || parsed.data.customOccasion?.formality || occasion?.formality || preferences?.formality || "",
            wardrobeItemCount: wardrobeItems.length
          },
          scoreBreakdown: built.scoreBreakdown,
          similarityMetadata: built.similarityMetadata
        })
      ]);
    }

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "outfit.recommend",
      entityType:
        "OutfitRecommendation",
      entityId: String(
        recommendation._id
      )
    });

    await incrementDailyPickUsage(
      String(auth.user._id)
    );

    return apiSuccess(
      {
        outfit: serializeOutfit(
          recommendation,
          built.items
        )
      },
      {
        message:
          "Outfit recommendation created.",
        status: 201
      }
    );
  } catch (error) {
    logSafeError("outfit.recommend", error);

    return apiError(
      "INTERNAL_ERROR",
      "Unable to create an outfit recommendation right now."
    );
  }
}
