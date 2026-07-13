export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { createSignedViewUrl, storageKeyBelongsToUser } from "@/lib/storage";
import { normalizeStorageKey } from "@/lib/storage/url";
import { OutfitPreview } from "@/models/OutfitPreview";
import { WardrobeItem } from "@/models/WardrobeItem";
import { WardrobeUpload } from "@/models/WardrobeUpload";

type RouteContext = {
  params: Promise<{
    key: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { key } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const storageKey = normalizeStorageKey(decodeURIComponent(key));
    const userId = String(auth.user._id);
    if (
      !storageKeyBelongsToUser({ userId, storageKey, prefix: "wardrobe" }) &&
      !storageKeyBelongsToUser({ userId, storageKey, prefix: "generated-previews" })
    ) {
      return apiError("NOT_FOUND", "Image access was not found.");
    }

    const ownedObject =
      (await WardrobeUpload.findOne({ userId: auth.user._id, storageKey }).select("_id").lean()) ||
      (await WardrobeItem.findOne({ userId: auth.user._id, storageKey }).select("_id").lean()) ||
      (await OutfitPreview.findOne({ userId: auth.user._id, storageKey }).select("_id").lean());

    if (!ownedObject) return apiError("NOT_FOUND", "Image access was not found.");

    const view = await createSignedViewUrl({ storageKey });

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "storage.signed_view",
      entityType: "StorageObject",
      entityId: storageKey
    });

    return apiSuccess({ view });
  } catch (error) {
    logSafeError("uploads.view", error);
    return apiError("INTERNAL_ERROR", "Unable to create image access right now.");
  }
}
