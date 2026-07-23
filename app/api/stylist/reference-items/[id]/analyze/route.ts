export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { analyzeReferenceFashionItem, serializeReferenceFashionItem } from "@/lib/ai/reference-fashion-item";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-reference:analyze:${meta.ip}`, limit: 12, windowMs: 60 * 1000, operation: "stylist-reference-analyze" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "That photo is no longer available.");

    const result = await analyzeReferenceFashionItem(id, String(auth.user._id));
    if (!result.ok && !result.item) {
      return apiError("NOT_FOUND", "That photo is no longer available.");
    }

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "stylist.reference_item.analyze",
      entityType: "ReferenceFashionItem",
      entityId: id
    });

    return apiSuccess(
      {
        referenceItem: serializeReferenceFashionItem(result.item),
        safeMessage: result.ok ? "" : "I couldn’t clearly identify the fashion item in this image. Try using a brighter photo where the full item is visible."
      },
      { message: result.ok ? "Reference photo analyzed." : "Photo needs a clearer view." }
    );
  } catch (error) {
    logSafeError("stylist.reference.analyze", error);
    return apiError("INTERNAL_ERROR", "I couldn’t clearly identify the fashion item in this image. Try using a brighter photo where the full item is visible.");
  }
}
