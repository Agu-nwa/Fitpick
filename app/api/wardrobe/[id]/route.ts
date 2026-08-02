export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { inferCondition, isObjectId, serializeWardrobeItem } from "@/lib/wardrobe";
import { WardrobeItem } from "@/models/WardrobeItem";
import { updateWardrobeItemSchema } from "@/schemas/wardrobe.schema";
import { detectTaxonomyConflicts } from "@/lib/wardrobe/taxonomy-review";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Wardrobe item was not found.");

    const item = await WardrobeItem.findOne({ _id: id, userId: auth.user._id }).lean();
    if (!item) return apiError("NOT_FOUND", "Wardrobe item was not found.");

    return apiSuccess({ item: serializeWardrobeItem(item) });
  } catch (error) {
    logSafeError("wardrobe.detail", error);
    return apiError("INTERNAL_ERROR", "Unable to load wardrobe item right now.");
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-update:${meta.ip}`, limit: 40, windowMs: 60 * 1000 });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Wardrobe item was not found.");

    const existing = await WardrobeItem.findOne({ _id: id, userId: auth.user._id });
    if (!existing) return apiError("NOT_FOUND", "Wardrobe item was not found.");

    const body = await readJson(request);
    const expectedUpdatedAt = isRecord(body) && typeof body.expectedUpdatedAt === "string" ? body.expectedUpdatedAt : "";
    const validatedBody = isRecord(body) ? Object.fromEntries(Object.entries(body).filter(([key]) => key !== "expectedUpdatedAt")) : body;
    if (expectedUpdatedAt && existing.updatedAt && new Date(expectedUpdatedAt).getTime() !== existing.updatedAt.getTime()) return apiError("CONFLICT", "This item changed since you opened it. Refresh and review the latest details.");
    const parsed = validateBody(
      updateWardrobeItemSchema,
      isRecord(validatedBody) ? { category: existing.category, subcategory: existing.subcategory || "", ...validatedBody } : validatedBody
    );
    if (!parsed.ok) return parsed.response;

    const taxonomyKeys = ["canonicalSubtype", "structureRole", "stylingRole", "visibilityRole", "setComponents", "taxonomyStatus", "taxonomyConfirmedBy", "taxonomyConfidence"];
    if (existing.taxonomyConfirmedBy === "user" && parsed.data.taxonomyConfirmedBy !== "user") {
      for (const key of taxonomyKeys) delete (parsed.data as Record<string, unknown>)[key];
    }
    if (parsed.data.taxonomyConfirmedBy === "user") {
      parsed.data.taxonomyStatus = parsed.data.taxonomyStatus === "unresolved" ? "unresolved" : "confirmed";
      parsed.data.taxonomyConfirmedAt = new Date();
      parsed.data.taxonomyConfidence = parsed.data.taxonomyStatus === "confirmed" ? 1 : 0;
      parsed.data.taxonomyNeedsReview = parsed.data.taxonomyStatus !== "confirmed";
    }

    Object.assign(existing, parsed.data);
    if (parsed.data.taxonomyConfirmedBy === "user") {
      const conflict = detectTaxonomyConflicts(existing);
      existing.taxonomyConflicts = conflict.conflicts;
      existing.taxonomyStatus = conflict.conflicts.length ? "needs_review" : existing.taxonomyStatus;
      existing.taxonomyNeedsReview = existing.taxonomyStatus !== "confirmed";
    }
    existing.condition = inferCondition({
      category: existing.category,
      color: existing.color,
      fit: existing.fit || existing.garmentFit,
      occasions: existing.occasions,
      condition: parsed.data.condition
    });

    await existing.save();
    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "wardrobe.update",
      entityType: "WardrobeItem",
      entityId: String(existing._id)
    });

    return apiSuccess({ item: serializeWardrobeItem(existing) }, { message: "Wardrobe item updated." });
  } catch (error) {
    if (error instanceof Error && error.name === "VersionError") return apiError("CONFLICT", "This item changed while you were reviewing it. Refresh and try again.");
    logSafeError("wardrobe.update", error);
    return apiError("INTERNAL_ERROR", "Unable to update wardrobe item right now.");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-delete:${meta.ip}`, limit: 20, windowMs: 60 * 1000 });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Wardrobe item was not found.");

    const hardDelete = request.nextUrl.searchParams.get("hard") === "true";
    const item = await WardrobeItem.findOne({ _id: id, userId: auth.user._id });
    if (!item) return apiError("NOT_FOUND", "Wardrobe item was not found.");

    if (hardDelete) {
      await item.deleteOne();
      await recordAuditEvent({
        request,
        userId: String(auth.user._id),
        action: "wardrobe.delete",
        entityType: "WardrobeItem",
        entityId: id
      });

      return apiSuccess({ deleted: true, archived: false }, { message: "Wardrobe item deleted." });
    }

    item.archivedAt = new Date();
    await item.save();
    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "wardrobe.archive",
      entityType: "WardrobeItem",
      entityId: String(item._id)
    });

    return apiSuccess({ item: serializeWardrobeItem(item), archived: true }, { message: "Wardrobe item archived." });
  } catch (error) {
    logSafeError("wardrobe.delete", error);
    return apiError("INTERNAL_ERROR", "Unable to archive wardrobe item right now.");
  }
}
