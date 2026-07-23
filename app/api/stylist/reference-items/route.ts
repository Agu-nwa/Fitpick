export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import {
  createReferenceFashionItem,
  referenceFashionItemCreateSchema,
  serializeReferenceFashionItem
} from "@/lib/ai/reference-fashion-item";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { storageKeyBelongsToUser } from "@/lib/storage";
import { getPublicStorageUrl, normalizeStorageKey } from "@/lib/storage/url";
import { readJson, validateBody } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `stylist-reference:create:${meta.ip}`, limit: 20, windowMs: 60 * 1000, operation: "stylist-reference-create" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(referenceFashionItemCreateSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const userId = String(auth.user._id);
    const storageKey = normalizeStorageKey(parsed.data.storageKey);
    if (!storageKeyBelongsToUser({ userId, storageKey, prefix: "wardrobe" })) {
      return apiError("BAD_REQUEST", "We couldn’t use that image. Try uploading it again.");
    }

    const item = await createReferenceFashionItem({
      ...parsed.data,
      userId,
      storageKey,
      imageUrl: getPublicStorageUrl(storageKey)
    });

    await recordAuditEvent({
      request,
      userId,
      action: "stylist.reference_item.create",
      entityType: "ReferenceFashionItem",
      entityId: String(item._id)
    });

    return apiSuccess({ referenceItem: serializeReferenceFashionItem(item) }, { message: "Reference photo added.", status: 201 });
  } catch (error) {
    logSafeError("stylist.reference.create", error);
    return apiError("INTERNAL_ERROR", "We couldn’t upload that image. Try another photo.");
  }
}
