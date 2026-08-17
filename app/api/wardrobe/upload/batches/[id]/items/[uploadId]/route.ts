export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { WardrobeUpload } from "@/models/WardrobeUpload";
import { WardrobeUploadBatch } from "@/models/WardrobeUploadBatch";
import { BackgroundJob } from "@/models/BackgroundJob";
import { deleteStoredObject, storageKeyBelongsToUser } from "@/lib/storage";

function collectStorageKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (!value || typeof value !== "object") return keys;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === "storageKey" && typeof child === "string" && child) keys.add(child);
    else collectStorageKeys(child, keys);
  }
  return keys;
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string; uploadId: string }> }) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id, uploadId } = await context.params;
    if (!isObjectId(id) || !isObjectId(uploadId)) return apiError("NOT_FOUND", "Batch item was not found.");
    const batch = await WardrobeUploadBatch.findOne({ _id: id, userId: auth.user._id, uploadIds: uploadId });
    const upload = await WardrobeUpload.findOne({ _id: uploadId, userId: auth.user._id, batchId: id });
    if (!batch || !upload) return apiError("NOT_FOUND", "Batch item was not found.");
    if (upload.createdItemId) return apiError("CONFLICT", "Saved closet items cannot be removed from this review.");
    batch.uploadIds = batch.uploadIds.filter((value) => String(value) !== uploadId);
    batch.itemCount = batch.uploadIds.length;
    await batch.save();
    await BackgroundJob.updateMany(
      { userId: auth.user._id, type: "wardrobe_analysis", "payload.uploadId": uploadId, status: { $in: ["queued", "failed", "dead_letter"] } },
      { $set: { status: "cancelled", errorMessage: "Upload removed during review." } }
    );
    const keys = collectStorageKeys(upload.toObject());
    const deletedKeys: string[] = [];
    for (const storageKey of Array.from(keys)) {
      if (!storageKeyBelongsToUser({ userId: String(auth.user._id), storageKey })) continue;
      const result = await deleteStoredObject({ storageKey });
      if (result.deleted) deletedKeys.push(storageKey);
    }
    await WardrobeUpload.deleteOne({ _id: upload._id, userId: auth.user._id, createdItemId: null });
    return apiSuccess({ removed: true, uploadId, deletedObjectCount: deletedKeys.length });
  } catch (error) {
    logSafeError("wardrobe.upload.batch.remove", error);
    return apiError("INTERNAL_ERROR", "Unable to remove this photo right now.");
  }
}
