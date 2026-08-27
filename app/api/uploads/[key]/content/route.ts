export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { downloadImageObject, storageKeyBelongsToUser } from "@/lib/storage";
import { decodeProtectedStorageKey } from "@/lib/storage/url";
import { logSafeError } from "@/lib/security/safe-log";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/upload-limits";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { key } = await context.params;
    const storageKey = decodeProtectedStorageKey(key);
    const userId = String(auth.user._id);
    const owned = (["wardrobe", "generated-previews", "avatar-previews"] as const)
      .some((prefix) => storageKeyBelongsToUser({ userId, storageKey, prefix })) ||
      storageKey.startsWith(`support/${userId}/`);
    if (!owned) return apiError("NOT_FOUND", "Image access was not found.");

    const image = await downloadImageObject({ storageKey, maxBytes: MAX_IMAGE_UPLOAD_BYTES });
    return new Response(new Uint8Array(image.body), {
      status: 200,
      headers: {
        "content-type": image.contentType || "application/octet-stream",
        "content-length": String(image.bytes),
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    logSafeError("uploads.content", error);
    return apiError("NOT_FOUND", "Image access was not found.");
  }
}
