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
import { wardrobeTagReviewSchema } from "@/schemas/wardrobe.schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-tags:${meta.ip}`, limit: 40, windowMs: 60 * 1000 });
  if (limited) return limited;

  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Wardrobe item was not found.");

    const item = await WardrobeItem.findOne({ _id: id, userId: auth.user._id });
    if (!item) return apiError("NOT_FOUND", "Wardrobe item was not found.");

    const body = await readJson(request);
    const parsed = validateBody(
      wardrobeTagReviewSchema,
      isRecord(body) ? { category: item.category, subcategory: item.subcategory || "", ...body } : body
    );
    if (!parsed.ok) return parsed.response;

    Object.assign(item, parsed.data);
    item.condition = inferCondition({
      category: item.category,
      color: item.color,
      occasions: item.occasions,
      condition: parsed.data.condition
    });

    await item.save();
    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "wardrobe.tags.review",
      entityType: "WardrobeItem",
      entityId: String(item._id)
    });

    return apiSuccess({ item: serializeWardrobeItem(item) }, { message: "Wardrobe tags reviewed." });
  } catch (error) {
    logSafeError("wardrobe.tags", error);
    return apiError("INTERNAL_ERROR", "Unable to review wardrobe tags right now.");
  }
}
