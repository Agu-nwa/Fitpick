export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { clearReferenceFashionItem, serializeReferenceFashionItem } from "@/lib/ai/reference-fashion-item";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { ReferenceFashionItem } from "@/models/ReferenceFashionItem";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-reference:get:${meta.ip}`, limit: 60, windowMs: 60 * 1000, operation: "stylist-reference-get" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "That photo is no longer available.");

    const item = await ReferenceFashionItem.findOne({ _id: id, userId: auth.user._id }).lean();
    if (!item) return apiError("NOT_FOUND", "That photo is no longer available.");

    return apiSuccess({ referenceItem: serializeReferenceFashionItem(item) });
  } catch (error) {
    logSafeError("stylist.reference.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load that photo right now.");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-reference:delete:${meta.ip}`, limit: 30, windowMs: 60 * 1000, operation: "stylist-reference-delete" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "That photo is no longer available.");

    const cleared = await clearReferenceFashionItem({ userId: String(auth.user._id), referenceItemId: id });
    return apiSuccess({ cleared: cleared.cleared, retained: cleared.retained }, { message: "Reference photo cleared." });
  } catch (error) {
    logSafeError("stylist.reference.delete", error);
    return apiError("INTERNAL_ERROR", "Unable to clear that photo right now.");
  }
}
