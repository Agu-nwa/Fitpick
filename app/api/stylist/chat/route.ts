export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";

import { apiSuccess, apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { askStylist } from "@/lib/ai/stylist";
import { buildRecentConversationContext, buildStylistContext } from "@/lib/ai/context/stylist-context";
import { sanitizeUserPrompt } from "@/lib/ai/safety/ai-safety";
import { buildRecommendation } from "@/lib/recommendation/engine";
import { parseStylistRequestIntent } from "@/lib/recommendation/occasion-intent";
import { constrainStylistToFinalizedRecommendation } from "@/lib/recommendation/integrity";
import { RecommendationPersistenceIntegrityError } from "@/lib/recommendation/persistence-integrity";
import { buildReferenceOutfitRecommendations } from "@/lib/recommendation/reference-matching";
import { buildOutfitHistorySummary, getRecentOutfitHistory, recordOutfitHistory } from "@/lib/recommendation/history";
import { resolveOwnedRegenerationContext } from "@/lib/recommendation/regeneration-server";
import { ensureCreditsForFeature, insufficientCreditsPayload, InsufficientCreditsError, spendCreditsAfterSuccess } from "@/lib/credits/credit-engine";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { getOrCreateStyleProfile, serializeStyleProfile } from "@/lib/style-profile/style-profile";
import { getCompatibilityEdgesForItems } from "@/lib/wardrobe/compatibility/compatibility-graph";
import { getMemorySummary, serializeMemorySummary } from "@/lib/fashion-memory/fashion-memory";
import { getWeatherForecast, isWeatherSensitiveMessage, weatherErrorMetadata } from "@/lib/weather/weather-service";
import { resolveRecommendationWeatherAvailability } from "@/lib/weather/stylist-weather-state";
import {
  createOrReuseStylistOutfitRecommendation,
  serializeStylistVisualization,
  shouldGenerateVisualization,
  triggerDigitalHumanPreviewForStylist,
  verifyStylistRecommendationSelection
} from "@/lib/stylist/stylist-visualization";
import { logReferenceItemEvent, serializeReferenceFashionItem } from "@/lib/ai/reference-fashion-item";
import { ReferenceFashionItem } from "@/models/ReferenceFashionItem";
import { WardrobeItem } from "@/models/WardrobeItem";
import { recommendationRegenerationSchema } from "@/schemas/stylist.schema";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

const stylistChatSchema = z.object({
  message: z.string().trim().min(1).max(800),
  allowShoppingAdvice: z.boolean().default(false),
  includeVisualization: z.boolean().optional(),
  visualMode: z.enum(["digital_human", "premium_preview", "none"]).optional(),
  referenceItemId: objectId.nullable().optional(),
  regeneration: recommendationRegenerationSchema.optional(),
  recentMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]).optional(),
        content: z.string().trim().max(800).optional()
      })
    )
    .max(8)
    .optional()
});

function compactRecommendationForStylist(recommendation: any) {
  return {
    title: recommendation.title,
    occasion: recommendation.occasion,
    confidence: recommendation.confidence,
    confidenceScore: recommendation.confidenceScore || 0,
    summary: recommendation.summary,
    occasionFit: recommendation.occasionFit,
    whyItWorks: recommendation.whyItWorks,
    improvementNote: recommendation.improvementNote,
    addLater: recommendation.addLater,
    completenessStatus: recommendation.completenessStatus,
    missingCategories: recommendation.missingCategories || [],
    completenessWarnings: recommendation.completenessWarnings || [],
    footwearIncluded: Boolean(recommendation.footwearIncluded),
    weatherAvailability: recommendation.weatherAvailability || (recommendation.weatherContext ? "available" : "not_requested"),
    recommendationMode: recommendation.recommendationMode,
    styleIntent: recommendation.styleIntent,
    freshnessCue: recommendation.freshnessCue,
    wardrobeReadiness: recommendation.wardrobeReadiness,
    gapInsights: recommendation.gapInsights || [],
    candidateCount: recommendation.candidateCount || 0,
    diverseCandidateCount: recommendation.diverseCandidateCount || 0,
    stylingTips: recommendation.stylingTips || [],
    outfitPieces: recommendation.outfitPieces || [],
    referenceItems: recommendation.referenceItems || [],
    items: (recommendation.items || []).map((item: any) => ({
      id: String(item._id),
      name: item.name,
      category: item.category,
      color: item.color,
      fabric: item.fabric,
      fit: item.fit
    }))
  };
}

function selectionRequiredStylist(referenceItem: any) {
  const visualization = serializeStylistVisualization();
  return {
    reply: "This photo contains several fashion items. Choose the one you want MyFitPick to style.",
    stylist: {
      message: "This photo contains several fashion items. Choose the one you want MyFitPick to style.",
      intent: "outfit_request" as const,
      recommendedOutfitIds: [],
      recommendedItemIds: [],
      alternativeItemIds: [],
      missingWardrobeCategories: [],
      occasionDetected: null,
      confidenceScore: 0,
      stylingTips: [],
      followUpQuestions: ["Which item should I style from this photo?"],
      addLaterSuggestions: [],
      safetyWarnings: [],
      visualMode: "none" as const,
      outfitRecommendationId: null,
      avatarPreview: visualization.avatarPreview,
      visualizationDisclaimer: visualization.visualizationDisclaimer
    },
    referenceItem: serializeReferenceFashionItem(referenceItem),
    referenceSelectionRequired: true,
    outfitRecommendationId: null,
    avatarPreview: visualization.avatarPreview,
    visualization,
    outfit: null,
    groundedItemCount: 0
  };
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-chat:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "stylist-chat" });
  if (limited) return limited;

  try {
    const auth = await requireUser();

    if (!auth.ok) {
      return auth.response;
    }

    const parsed = stylistChatSchema.safeParse(await request.json());
    if (!parsed.success) return apiError("BAD_REQUEST", "Message is required.");

    let referenceItem: any = null;
    if (parsed.data.referenceItemId) {
      referenceItem = await ReferenceFashionItem.findOne({ _id: parsed.data.referenceItemId, userId: auth.user._id }).lean();
      if (!referenceItem) return apiError("NOT_FOUND", "That photo is no longer available.");
      if (referenceItem.status === "needs-selection") {
        return apiSuccess(selectionRequiredStylist(referenceItem));
      }
      if (referenceItem.status !== "ready" || !referenceItem.usableForMatching) {
        return apiError("BAD_REQUEST", "I couldn’t identify a clear fashion item. Try another photo.");
      }
    }

    try {
      await ensureCreditsForFeature(auth.user._id, "ai_stylist_chat");
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return apiError("INSUFFICIENT_CREDITS", "You're out of Credits. Purchase more Credits to continue.", {
          details: insufficientCreditsPayload(error)
        });
      }
      throw error;
    }

    const [wardrobe, styleProfile, memorySummary] = await Promise.all([
      WardrobeItem.find({
        userId: auth.user._id,
        archivedAt: null
      }).lean(),
      getOrCreateStyleProfile(auth.user._id),
      getMemorySummary(auth.user._id)
    ]);
    const outfitHistory = await getRecentOutfitHistory(auth.user._id, 60);

    const serializedStyleProfile = serializeStyleProfile(styleProfile);
    const serializedMemorySummary = serializeMemorySummary(memorySummary);
    const outfitHistorySummary = buildOutfitHistorySummary(outfitHistory);
    const stylistContext = buildStylistContext(wardrobe, serializedStyleProfile, serializedMemorySummary);
    const regeneration = await resolveOwnedRegenerationContext({
      userId: String(auth.user._id),
      request: parsed.data.regeneration,
      wardrobeItems: wardrobe
    });
    const recentMessages = buildRecentConversationContext(parsed.data.recentMessages || []);
    const sanitizedMessage = sanitizeUserPrompt(parsed.data.message);
    const requestIntent = parseStylistRequestIntent(sanitizedMessage);
    const occasionIntent = requestIntent.occasion;
    let weatherContext = "";
    const weatherRequested = isWeatherSensitiveMessage(sanitizedMessage);
    let weatherAvailability = resolveRecommendationWeatherAvailability({ requested: weatherRequested });
    if (weatherRequested) {
      try {
        const forecast = await getWeatherForecast({
          city: auth.user.weatherCityName || auth.user.weatherLocationName || undefined,
          countryCode: auth.user.weatherCountryCode || undefined,
          countryName: auth.user.weatherCountryName || undefined,
          locationName: auth.user.weatherLocationName || undefined,
          latitude: typeof auth.user.weatherLatitude === "number" ? auth.user.weatherLatitude : undefined,
          longitude: typeof auth.user.weatherLongitude === "number" ? auth.user.weatherLongitude : undefined,
          days: 3
        });
        weatherContext = forecast.summary;
        weatherAvailability = resolveRecommendationWeatherAvailability({ requested: true, weatherContext });
      } catch (error) {
        logSafeError("stylist.chat.weather", error, weatherErrorMetadata(error, {
          city: auth.user.weatherCityName || auth.user.weatherLocationName || undefined,
          countryCode: auth.user.weatherCountryCode || undefined
        }));
      }
    }
    let referenceRecommendations: any[] = [];
    let deterministicRecommendation: any;
    const compatibilityEdges = await getCompatibilityEdgesForItems({
      userId: String(auth.user._id),
      itemIds: wardrobe.map((item: any) => String(item._id)),
      minScore: 45
    });
    if (referenceItem) {
      logReferenceItemEvent({ event: "wardrobe_match_started", userId: String(auth.user._id), referenceItemId: String(referenceItem._id), status: referenceItem.status, category: referenceItem.category });
      try {
        referenceRecommendations = buildReferenceOutfitRecommendations({
          referenceItem,
          wardrobeItems: wardrobe,
          message: sanitizedMessage,
          occasionName: occasionIntent.label,
          weatherContext,
          weatherAvailability,
          styleProfile: serializedStyleProfile,
          memorySummary: serializedMemorySummary,
          outfitHistorySummary,
          compatibilityEdges,
          regeneration,
          limit: 3
        });
        deterministicRecommendation = referenceRecommendations[0];
        logReferenceItemEvent({ event: "wardrobe_match_completed", userId: String(auth.user._id), referenceItemId: String(referenceItem._id), status: referenceItem.status, category: referenceItem.category });
      } catch (error) {
        logSafeError("stylist.reference.match", error, { referenceItemId: String(referenceItem._id), userId: String(auth.user._id) });
        logReferenceItemEvent({ event: "wardrobe_match_failed", userId: String(auth.user._id), referenceItemId: String(referenceItem._id), status: referenceItem.status, category: referenceItem.category });
        throw error;
      }
    } else {
      deterministicRecommendation = buildRecommendation({
        occasionName: occasionIntent.label,
        weatherContext,
        weatherAvailability,
        preferences: {},
        styleDirection: requestIntent.styleDirections[0],
        styleProfile: serializedStyleProfile,
        memorySummary: serializedMemorySummary,
        outfitHistorySummary,
        compatibilityEdges,
        wardrobeItems: wardrobe,
        wornLooks: [],
        recommendationMode: regeneration ? "something_different" : undefined,
        regeneration
      });
    }
    // Re-resolve the engine selection against the database before it is sent to
    // the explanation model. This forces every selected item into the final AI
    // context even when it was outside the balanced 50-item prompt sample.
    const engineSelectedItems = deterministicRecommendation.items || [];
    const verifiedForExplanation = await verifyStylistRecommendationSelection(
      String(auth.user._id),
      deterministicRecommendation
    );
    deterministicRecommendation = {
      ...deterministicRecommendation,
      integrityEngineSelectedItems: engineSelectedItems,
      items: verifiedForExplanation.items,
      summary: verifiedForExplanation.copy.summary,
      whyItWorks: verifiedForExplanation.copy.whyItWorks,
      stylingTips: verifiedForExplanation.copy.stylingTips,
      completenessWarnings: [
        ...(deterministicRecommendation.completenessWarnings || []),
        ...verifiedForExplanation.copy.warnings
      ]
    };
    const stylistRecommendation = compactRecommendationForStylist(deterministicRecommendation);
    const wardrobeSummary = stylistContext.promptWardrobeItems
      .map((item: any) => [
        `id:${item.id}`,
        `name:${item.name}`,
        `category:${item.category}`,
        `color:${item.color}`,
        `garmentType:${item.garmentType}`,
        `fabric:${item.fabric}`,
        `fit:${item.fit}`,
        `occasions:${(item.occasions || []).join(",") || "unknown"}`,
        `weather:${(item.weather || []).join(",") || "unknown"}`
      ].join(" | "))
      .join("\n");

    const response = await askStylist({
      message: sanitizedMessage,
      wardrobeSummary,
      wardrobeContext: stylistContext.wardrobe,
      styleProfile: stylistContext.styleProfile,
      memorySummary: stylistContext.memorySummary,
      fallback: stylistContext.fallback,
      allowShoppingAdvice: parsed.data.allowShoppingAdvice,
      ownedItemIds: stylistContext.ownedItemIds,
      recentMessages,
      weatherContext,
      deterministicRecommendation: stylistRecommendation,
      referenceContext: referenceItem ? serializeReferenceFashionItem(referenceItem) : null
    });

    let chatCreditCharge: Awaited<ReturnType<typeof spendCreditsAfterSuccess>>;
    try {
      chatCreditCharge = await spendCreditsAfterSuccess({
        userId: auth.user._id,
        feature: "ai_stylist_chat",
        referenceId: `stylist-chat:${crypto.randomUUID()}`,
        metadata: {
          source: "stylist_chat",
          visualMode: parsed.data.visualMode || "digital_human",
          referenceItemId: referenceItem ? String(referenceItem._id) : ""
        }
      });
    } catch (error) {
      if (error instanceof InsufficientCreditsError) {
        return apiError("INSUFFICIENT_CREDITS", "You're out of Credits. Purchase more Credits to continue.", {
          details: insufficientCreditsPayload(error)
        });
      }
      throw error;
    }

    let visualization = serializeStylistVisualization();
    let persistedOutfit: Awaited<ReturnType<typeof createOrReuseStylistOutfitRecommendation>> = null;
    const persistedReferenceOutfits: Array<Awaited<ReturnType<typeof createOrReuseStylistOutfitRecommendation>>> = [];
    const visualMode = parsed.data.visualMode || "digital_human";
    const hasOutfit = Boolean(deterministicRecommendation.items?.length);
    const wantsVisualization = shouldGenerateVisualization(response.stylist.intent, sanitizedMessage, {
      includeVisualization: parsed.data.includeVisualization,
      visualMode,
      hasOutfit
    });

    if (referenceItem && hasOutfit && referenceRecommendations.length) {
      for (const recommendation of referenceRecommendations.slice(0, 3)) {
        const persistedReferenceOutfit = await createOrReuseStylistOutfitRecommendation(
          String(auth.user._id),
          recommendation,
          {
            ownedItemIds: stylistContext.ownedItemIds,
            requestText: sanitizedMessage,
            source: "stylist_chat"
          }
        );
        if (persistedReferenceOutfit) persistedReferenceOutfits.push(persistedReferenceOutfit);
      }
      persistedOutfit = persistedReferenceOutfits[0] || null;
    } else if (hasOutfit && wantsVisualization) {
      persistedOutfit = await createOrReuseStylistOutfitRecommendation(
        String(auth.user._id),
        deterministicRecommendation,
        {
          requestText: sanitizedMessage,
          source: "stylist_chat"
        }
      );
    }

    if (persistedOutfit?.outfitRecommendationId) {
      const persistedItemIds = persistedOutfit.items.map((item: any) => item._id);
      const historyWrites: Array<Promise<unknown>> = [
        WardrobeItem.updateMany(
          { _id: { $in: persistedItemIds }, userId: auth.user._id },
          {
            $set: { lastRecommendedAt: new Date() },
            $inc: { recommendationCount: 1 }
          }
        ),
        recordOutfitHistory({
          userId: auth.user._id,
          outfitId: persistedOutfit.outfitRecommendationId,
          itemIds: persistedItemIds,
          eventType: "generated",
          source: "stylist_chat",
          recommendationMode: deterministicRecommendation.recommendationMode,
          occasion: persistedOutfit.outfit.occasion,
          context: {
            requestText: sanitizedMessage.slice(0, 220),
            weatherContext,
            wardrobeItemCount: wardrobe.length,
            referenceItemId: referenceItem ? String(referenceItem._id) : ""
          },
          scoreBreakdown: deterministicRecommendation.scoreBreakdown,
          similarityMetadata: deterministicRecommendation.similarityMetadata
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
          occasion: persistedOutfit.outfit.occasion,
          context: {
            replacementOutfitId: persistedOutfit.outfitRecommendationId
          }
        }));
      }
      await Promise.all(historyWrites);
    }

    if (wantsVisualization) {
      const visualizationLimited = rateLimitRequest({
        key: `stylist-visualization:${String(auth.user._id)}`,
        limit: 6,
        windowMs: 60 * 1000,
        operation: "stylist-visualization"
      });

      if (visualizationLimited) {
        visualization = serializeStylistVisualization({
          visualMode,
          avatarPreview: {
            status: "failed",
            jobId: null,
            previewId: null,
            imageUrl: null,
            cacheKey: null,
            errorMessage: "Avatar preview is busy right now. Please try again shortly."
          }
        });
      } else {
        try {
          visualization = persistedOutfit
            ? await triggerDigitalHumanPreviewForStylist(String(auth.user._id), persistedOutfit.outfitRecommendationId, { visualMode })
            : serializeStylistVisualization({
                visualMode,
                avatarPreview: {
                  status: "not_started",
                  jobId: null,
                  previewId: null,
                  imageUrl: null,
                  cacheKey: null,
                  errorMessage: "MyFitPick could not assemble a complete owned outfit to visualize."
                }
              });
        } catch (error) {
          logSafeError("stylist.visualization", error);
          visualization = serializeStylistVisualization({
            visualMode,
            outfitRecommendationId: persistedOutfit?.outfitRecommendationId || null,
            avatarPreview: {
              status: "failed",
              jobId: null,
              previewId: null,
              imageUrl: null,
              cacheKey: null,
              errorMessage: "Unable to show the outfit on your avatar right now."
            }
          });
        }
      }
    }

    const verifiedStylist = persistedOutfit
      ? constrainStylistToFinalizedRecommendation(response.stylist, {
          items: persistedOutfit.items,
          whyItWorks: persistedOutfit.outfit.whyItWorks,
          summary: persistedOutfit.outfit.summary,
          stylingTips: persistedOutfit.outfit.stylingTips
        })
      : response.stylist;
    const stylist = {
      ...verifiedStylist,
      visualMode: visualization.visualMode,
      outfitRecommendationId: visualization.outfitRecommendationId || persistedOutfit?.outfitRecommendationId || null,
      avatarPreview: visualization.avatarPreview,
      visualizationDisclaimer: visualization.visualizationDisclaimer,
      fitLock: visualization.fitLock
    };
    const responseOutfitId = visualization.outfitRecommendationId || persistedOutfit?.outfitRecommendationId || null;
    const redirectTo = responseOutfitId && !referenceItem ? `/outfit/${responseOutfitId}/preview` : null;

    return apiSuccess({
      reply: persistedOutfit ? verifiedStylist.message : response.reply,
      stylist,
      referenceItem: referenceItem ? serializeReferenceFashionItem(referenceItem) : null,
      referenceRecommendations: referenceRecommendations.map((recommendation, index) => {
        const persisted = persistedReferenceOutfits[index];
        if (persisted?.serializedOutfit) return persisted.serializedOutfit;
        return {
          ...recommendation,
          items: (recommendation.items || []).map((item: any) => ({
            id: String(item._id || item.id),
            name: item.name,
            category: item.category,
            subcategory: item.subcategory || "",
            color: item.color || "",
            pattern: item.pattern || "",
            fabric: item.fabric || "",
            fit: item.fit || "",
            formality: item.formality || [],
            occasions: item.occasions || [],
            weather: item.weather || [],
            condition: item.condition || "ready",
            imageUrl: item.imageUrl || "",
            thumbnailUrl: item.thumbnailUrl || item.imageUrl || ""
          }))
        };
      }),
      referenceSelectionRequired: false,
      outfitRecommendationId: responseOutfitId,
      avatarPreview: visualization.avatarPreview,
      visualization,
      outfit: persistedOutfit?.serializedOutfit || null,
      job: visualization.job,
      redirectTo,
      wallet: chatCreditCharge.wallet,
      creditCharge: {
        feature: chatCreditCharge.transaction.feature,
        credits: chatCreditCharge.transaction.credits,
        balance: chatCreditCharge.wallet.balance
      },
      groundedItemCount: wardrobe.length
    });
  } catch (error) {
    logSafeError("stylist.chat", error);

    if (error instanceof RecommendationPersistenceIntegrityError) {
      return apiError(
        "CONFLICT",
        "One or more selected closet items are no longer available. Refresh your closet and generate the look again."
      );
    }

    return apiError(
      "INTERNAL_ERROR",
      "Unable to contact stylist."
    );
  }
}
