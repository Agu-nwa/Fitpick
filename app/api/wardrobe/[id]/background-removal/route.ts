export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { removeBgBackgroundRemovalVersion, removeBackgroundWithRemoveBg } from "@/lib/image-processing/remove-bg";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload-policy";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { createStorageKey, uploadImageObject } from "@/lib/storage";
import { getWardrobeOriginalImage, isObjectId, serializeWardrobeItem } from "@/lib/wardrobe";
import { WardrobeItem } from "@/models/WardrobeItem";

type RouteContext = { params: Promise<{ id: string }> };

async function markFailed(itemId: string, userId: string, safeMessage: string, provider: string | null) {
  return WardrobeItem.findOneAndUpdate(
    { _id: itemId, userId },
    { $set: {
      "images.front.backgroundRemovalStatus": "failed",
      "images.front.backgroundRemovalProvider": provider,
      "images.front.backgroundRemovalError": safeMessage,
      "images.front.variants.cutout.status": "failed",
      "images.front.variants.cutout.errorMessage": safeMessage
    } },
    { new: true }
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-bg-retry:${meta.ip}`, limit: 6, windowMs: 60_000, operation: "wardrobe-background-removal" });
  if (limited) return limited;
  const startedAt = Date.now();
  try {
    const { id } = await context.params;
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Wardrobe item was not found.");
    const userId = String(auth.user._id);
    const claimed = await WardrobeItem.findOneAndUpdate(
      { _id: id, userId: auth.user._id, "images.front.backgroundRemovalStatus": { $ne: "processing" } },
      { $set: {
        "images.front.backgroundRemovalStatus": "processing",
        "images.front.backgroundRemovalError": null,
        "images.front.variants.cutout.status": "processing",
        "images.front.variants.cutout.errorMessage": ""
      }, $inc: { "images.front.backgroundRemovalAttempts": 1 } },
      { new: true }
    );
    if (!claimed) {
      const existing = await WardrobeItem.findOne({ _id: id, userId: auth.user._id }).lean();
      if (!existing) return apiError("NOT_FOUND", "Wardrobe item was not found.");
      return apiError("CONFLICT", "This photo is already being prepared.");
    }
    const originalUrl = getWardrobeOriginalImage(claimed.toObject());
    const originalKey = claimed.images?.front?.variants?.original?.storageKey || claimed.images?.front?.storageKey || claimed.storageKey || "";
    if (!originalUrl || !originalKey) {
      const failed = await markFailed(id, userId, "We couldn’t clean this photo. Replace it or continue with the original.", null);
      return apiError("VALIDATION_ERROR", "The original wardrobe photo is unavailable.", { details: failed ? { item: serializeWardrobeItem(failed) } : undefined });
    }
    const sourceResponse = await fetch(originalUrl, { signal: AbortSignal.timeout(15_000) });
    const sourceContentType = sourceResponse.headers.get("content-type") || "";
    if (!sourceResponse.ok || !sourceContentType.startsWith("image/")) throw new Error("original_image_fetch_failed");
    const source = Buffer.from(await sourceResponse.arrayBuffer());
    if (!source.byteLength || source.byteLength > MAX_IMAGE_UPLOAD_BYTES) throw new Error("original_image_invalid_size");
    const removal = await removeBackgroundWithRemoveBg({ buffer: source, filename: `wardrobe-${id}.webp`, mimeType: sourceContentType });
    if (!removal.ok) {
      const safeMessage = "We couldn’t clean this photo. You can retry or continue with the original.";
      const failed = await markFailed(id, userId, safeMessage, removal.provider);
      logSafeError("wardrobe.background-removal.provider", new Error(removal.reason), { wardrobeItemId: id, stage: "provider", provider: removal.provider, sourceContentType, sourceByteSize: source.byteLength, status: "failed", failureCode: removal.reason, providerStatusCode: removal.statusCode, durationMs: Date.now() - startedAt });
      return apiSuccess({ item: failed ? serializeWardrobeItem(failed) : null, completed: false }, { message: safeMessage });
    }
    const processedKey = createStorageKey({ userId, filename: removal.filename, purpose: `processed-bg-${removeBgBackgroundRemovalVersion}` });
    if (processedKey === originalKey) throw new Error("processed_key_matches_original");
    const uploaded = await uploadImageObject({ storageKey: processedKey, mimeType: removal.mimeType, body: removal.buffer });
    if (!uploaded.url || uploaded.url === originalUrl) throw new Error("processed_url_matches_original");
    const processedAt = new Date();
    const item = await WardrobeItem.findOneAndUpdate(
      { _id: id, userId: auth.user._id, "images.front.backgroundRemovalStatus": "processing" },
      { $set: {
        imageUrl: uploaded.url,
        thumbnailUrl: uploaded.url,
        "images.front.url": uploaded.url,
        "images.front.storageKey": uploaded.storageKey,
        "images.front.backgroundRemovalStatus": "completed",
        "images.front.backgroundRemovalProvider": removal.provider,
        "images.front.backgroundRemovalVersion": removeBgBackgroundRemovalVersion,
        "images.front.backgroundRemovalError": null,
        "images.front.backgroundRemovalProcessedAt": processedAt,
        "images.front.variants.cutout": { url: uploaded.url, storageKey: uploaded.storageKey, provider: "s3", width: removal.width, height: removal.height, bytes: removal.buffer.byteLength, status: "ready", processedAt, errorMessage: "" }
      } },
      { new: true }
    );
    if (!item) throw new Error("background_removal_state_conflict");
    return apiSuccess({ item: serializeWardrobeItem(item), completed: true }, { message: "Photo prepared." });
  } catch (error) {
    const { id } = await context.params;
    const auth = await requireUser();
    if (auth.ok && isObjectId(id)) await markFailed(id, String(auth.user._id), "We couldn’t clean this photo. You can retry or continue with the original.", null);
    logSafeError("wardrobe.background-removal", error, { wardrobeItemId: id, stage: "processing", status: "failed", durationMs: Date.now() - startedAt });
    return apiError("INTERNAL_ERROR", "We couldn’t clean this photo. You can retry or continue with the original.");
  }
}
