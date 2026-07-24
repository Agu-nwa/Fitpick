export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { markReferenceItemsSavedWithOutfit } from "@/lib/ai/reference-fashion-item";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { isObjectId } from "@/lib/wardrobe";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { recordOutfitHistory } from "@/lib/recommendation/history";
import { saveOutfitSchema } from "@/schemas/outfit.schema";

type RouteContext = { params: Promise<{ id: string }> };

function referenceItemIdsForOutfit(outfit: any) {
  return Array.from(
    new Set([
      ...(outfit.referenceItemIds || []).map(String),
      ...((outfit.outfitPieces || []) as any[])
        .filter((piece) => piece?.source === "reference-upload")
        .map((piece) => String(piece.referenceItemId || ""))
        .filter(Boolean),
      ...((outfit.reasoningMetadata?.outfitPieces || []) as any[])
        .filter((piece) => piece?.source === "reference-upload")
        .map((piece) => String(piece.referenceItemId || ""))
        .filter(Boolean)
    ])
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `outfit-save:${meta.ip}`, limit: 40, windowMs: 60 * 1000, operation: "outfit-save" });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Outfit was not found.");

    const parsed = validateBody(saveOutfitSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const outfit = await OutfitRecommendation.findOne({ _id: id, userId: auth.user._id });
    if (!outfit) return apiError("NOT_FOUND", "Outfit was not found.");

    outfit.title = parsed.data.title || outfit.title || `${outfit.occasion || "Saved"} outfit`;
    outfit.favorite = parsed.data.favorite ?? Boolean(outfit.favorite);
    outfit.savedAt = outfit.savedAt || new Date();
    await outfit.save();
    const referenceItemIds = referenceItemIdsForOutfit(outfit);
    if (referenceItemIds.length) {
      await markReferenceItemsSavedWithOutfit({
        userId: String(auth.user._id),
        referenceItemIds,
        outfitRecommendationId: String(outfit._id)
      });
    }

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "outfit.save",
      entityType: "OutfitRecommendation",
      entityId: String(outfit._id)
    });

    await recordOutfitHistory({
      userId: auth.user._id,
      outfitId: outfit._id,
      itemIds: outfit.itemIds,
      eventType: "saved",
      source: outfit.source === "stylist_chat" ? "stylist_chat" : "outfit_page",
      recommendationMode: (outfit as any).recommendationMode || (outfit as any).reasoningMetadata?.recommendationMode || "todays_best",
      occasion: outfit.occasion,
      feedbackRating: parsed.data.favorite ? 5 : 4
    });

    return apiSuccess(
      {
        outfit: {
          id: String(outfit._id),
          title: outfit.title,
          favorite: Boolean(outfit.favorite),
          savedAt: outfit.savedAt ? new Date(outfit.savedAt).toISOString() : null
        }
      },
      { message: "Outfit saved." }
    );
  } catch (error) {
    logSafeError("outfit.save", error);
    return apiError("INTERNAL_ERROR", "Unable to save outfit right now.");
  }
}
