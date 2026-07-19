export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { validateBody } from "@/lib/validation";
import { readJson } from "@/lib/validation";
import { SavedLook } from "@/models/SavedLook";
import { WardrobeItem } from "@/models/WardrobeItem";
import { WornLook } from "@/models/WornLook";
import { looksQuerySchema, manualLookSchema } from "@/schemas/outfit.schema";

function serializeSaved(look: any) {
  return {
    id: String(look._id),
    outfitId: look.outfitId ? String(look.outfitId) : null,
    source: look.source || "ai_saved",
    title: look.title,
    occasion: look.occasion,
    itemIds: (look.itemIds || []).map(String),
    favorite: Boolean(look.favorite),
    notes: look.notes || "",
    savedAt: look.savedAt ? new Date(look.savedAt).toISOString() : null
  };
}

function serializeWorn(look: any) {
  return {
    id: String(look._id),
    outfitId: String(look.outfitId),
    occasion: look.occasion,
    itemIds: (look.itemIds || []).map(String),
    wornAt: look.wornAt ? new Date(look.wornAt).toISOString() : null,
    rating: look.rating || "",
    repeatWarning: look.wornAt && (Date.now() - new Date(look.wornAt).getTime()) / 86_400_000 < 7
      ? "Worn recently"
      : ""
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(looksQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.ok) return parsed.response;

    const tab = parsed.data.tab || "all";
    const limit = parsed.data.limit || 20;
    const baseQuery: Record<string, unknown> = { userId: auth.user._id };
    if (parsed.data.occasion) baseQuery.occasion = parsed.data.occasion;
    if (parsed.data.cursor) baseQuery._id = { $lt: parsed.data.cursor };

    const [saved, worn, favorites] = await Promise.all([
      tab === "worn" ? [] : SavedLook.find(baseQuery).sort({ savedAt: -1 }).limit(limit).lean(),
      tab === "saved" || tab === "favorites" ? [] : WornLook.find(baseQuery).sort({ wornAt: -1 }).limit(limit).lean(),
      tab === "worn" ? [] : SavedLook.find({ ...baseQuery, favorite: true }).sort({ savedAt: -1 }).limit(limit).lean()
    ]);

    return apiSuccess({
      saved: saved.map(serializeSaved),
      worn: worn.map(serializeWorn),
      favorites: favorites.map(serializeSaved),
      counts: {
        saved: saved.length,
        worn: worn.length,
        favorites: favorites.length
      }
    });
  } catch (error) {
    logSafeError("looks.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load looks right now.");
  }
}

async function ownedWardrobeItemIds(userId: any, itemIds: string[]) {
  const uniqueIds = Array.from(new Set(itemIds.map(String)));
  const items = await WardrobeItem.find({ _id: { $in: uniqueIds }, userId, archivedAt: null }).select("_id").lean();
  const owned = new Set(items.map((item) => String(item._id)));
  return uniqueIds.every((itemId) => owned.has(itemId)) ? uniqueIds : null;
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `looks:create:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "looks-create" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(manualLookSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const itemIds = await ownedWardrobeItemIds(auth.user._id, parsed.data.itemIds);
    if (!itemIds) return apiError("BAD_REQUEST", "Choose only items from your closet.");

    const lookId = new SavedLook()._id;
    const look = await SavedLook.create({
      _id: lookId,
      userId: auth.user._id,
      outfitId: lookId,
      source: "manual",
      title: parsed.data.title,
      occasion: parsed.data.occasion || "",
      itemIds,
      favorite: parsed.data.favorite || false,
      notes: parsed.data.notes || "",
      savedAt: new Date()
    });

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "looks.create",
      entityType: "SavedLook",
      entityId: String(look._id)
    });

    return apiSuccess({ look: serializeSaved(look) }, { message: "Look saved.", status: 201 });
  } catch (error) {
    logSafeError("looks.create", error);
    return apiError("INTERNAL_ERROR", "Unable to save this look right now.");
  }
}
