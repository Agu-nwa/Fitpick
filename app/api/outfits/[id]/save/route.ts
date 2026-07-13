export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitPlaceholder } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { isObjectId } from "@/lib/wardrobe";
import { OutfitRecommendation } from "@/models/OutfitRecommendation";
import { SavedLook } from "@/models/SavedLook";
import { saveOutfitSchema } from "@/schemas/outfit.schema";

type RouteContext = { params: Promise<{ id: string }> };

function serializeSavedLook(look: any) {
  return {
    id: String(look._id),
    outfitId: String(look.outfitId),
    title: look.title,
    occasion: look.occasion,
    itemIds: (look.itemIds || []).map(String),
    favorite: Boolean(look.favorite),
    savedAt: look.savedAt ? new Date(look.savedAt).toISOString() : null
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitPlaceholder({ key: `outfit-save:${meta.ip}`, limit: 40, windowMs: 60 * 1000, operation: "outfit-save" });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Outfit was not found.");

    const parsed = validateBody(saveOutfitSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const outfit = await OutfitRecommendation.findOne({ _id: id, userId: auth.user._id }).lean();
    if (!outfit) return apiError("NOT_FOUND", "Outfit was not found.");

    const look = await SavedLook.findOneAndUpdate(
      { userId: auth.user._id, outfitId: outfit._id },
      {
        $setOnInsert: {
          userId: auth.user._id,
          outfitId: outfit._id,
          itemIds: outfit.itemIds,
          occasion: outfit.occasion,
          savedAt: new Date()
        },
        $set: {
          title: parsed.data.title || outfit.title || `${outfit.occasion} outfit`,
          favorite: parsed.data.favorite ?? false
        }
      },
      { new: true, upsert: true }
    );

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "outfit.save",
      entityType: "SavedLook",
      entityId: String(look._id)
    });

    return apiSuccess({ look: serializeSavedLook(look) }, { message: "Outfit saved." });
  } catch (error) {
    logSafeError("outfit.save", error);
    return apiError("INTERNAL_ERROR", "Unable to save outfit right now.");
  }
}
