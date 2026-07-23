export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import {
  logReferenceItemEvent,
  referenceFashionItemSelectionSchema,
  selectDetectedReferenceItem,
  serializeReferenceFashionItem
} from "@/lib/ai/reference-fashion-item";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { isObjectId } from "@/lib/wardrobe";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-reference:select:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "stylist-reference-select" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "That photo is no longer available.");

    const parsed = validateBody(referenceFashionItemSelectionSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const result = await selectDetectedReferenceItem({
      userId: String(auth.user._id),
      referenceItemId: id,
      detectedItemId: parsed.data.detectedItemId
    });
    if (!result.ok) return apiError("NOT_FOUND", "That photo is no longer available.");

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "stylist.reference_item.select",
      entityType: "ReferenceFashionItem",
      entityId: id
    });
    logReferenceItemEvent({ event: "reference_item_selected", userId: String(auth.user._id), referenceItemId: id, status: result.item.status, category: result.item.category });

    return apiSuccess({ referenceItem: serializeReferenceFashionItem(result.item) }, { message: "Reference item selected." });
  } catch (error) {
    logSafeError("stylist.reference.selection", error);
    return apiError("INTERNAL_ERROR", "Unable to select that item right now.");
  }
}
