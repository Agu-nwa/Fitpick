export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { readJson, validateBody } from "@/lib/validation";
import { SavedLook } from "@/models/SavedLook";
import { WardrobeItem } from "@/models/WardrobeItem";
import { updateManualLookSchema } from "@/schemas/outfit.schema";

type RouteContext = { params: Promise<{ id: string }> };

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

async function ownedWardrobeItemIds(userId: any, itemIds: string[]) {
  const uniqueIds = Array.from(new Set(itemIds.map(String)));
  const items = await WardrobeItem.find({ _id: { $in: uniqueIds }, userId, archivedAt: null }).select("_id").lean();
  const owned = new Set(items.map((item) => String(item._id)));
  return uniqueIds.every((itemId) => owned.has(itemId)) ? uniqueIds : null;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `looks:update:${meta.ip}`, limit: 40, windowMs: 60 * 1000, operation: "looks-update" });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Look was not found.");

    const parsed = validateBody(updateManualLookSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const look = await SavedLook.findOne({ _id: id, userId: auth.user._id });
    if (!look) return apiError("NOT_FOUND", "Look was not found.");

    if (parsed.data.itemIds && look.source !== "manual") {
      return apiError("BAD_REQUEST", "Only manual looks can change selected items.");
    }

    const patch: Record<string, unknown> = {};
    if (parsed.data.title !== undefined) patch.title = parsed.data.title;
    if (parsed.data.occasion !== undefined) patch.occasion = parsed.data.occasion || "";
    if (parsed.data.favorite !== undefined) patch.favorite = parsed.data.favorite;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes || "";

    if (parsed.data.itemIds) {
      const itemIds = await ownedWardrobeItemIds(auth.user._id, parsed.data.itemIds);
      if (!itemIds) return apiError("BAD_REQUEST", "Choose only items from your closet.");
      patch.itemIds = itemIds;
    }

    const updated = await SavedLook.findOneAndUpdate({ _id: id, userId: auth.user._id }, { $set: patch }, { new: true });
    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "looks.update",
      entityType: "SavedLook",
      entityId: id
    });
    return apiSuccess({ look: serializeSaved(updated) }, { message: "Look updated." });
  } catch (error) {
    logSafeError("looks.update", error);
    return apiError("INTERNAL_ERROR", "Unable to update this look right now.");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const meta = requestMeta(_request);
  const limited = rateLimitRequest({ key: `looks:delete:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "looks-delete" });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Look was not found.");

    const deleted = await SavedLook.findOneAndDelete({ _id: id, userId: auth.user._id });
    if (!deleted) return apiError("NOT_FOUND", "Look was not found.");

    await recordAuditEvent({
      request: _request,
      userId: String(auth.user._id),
      action: "looks.delete",
      entityType: "SavedLook",
      entityId: id
    });

    return apiSuccess({ deleted: true }, { message: "Look deleted." });
  } catch (error) {
    logSafeError("looks.delete", error);
    return apiError("INTERNAL_ERROR", "Unable to delete this look right now.");
  }
}
