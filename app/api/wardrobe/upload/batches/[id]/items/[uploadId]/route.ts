export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { WardrobeUpload } from "@/models/WardrobeUpload";
import { WardrobeUploadBatch } from "@/models/WardrobeUploadBatch";

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
    upload.batchId = null as any;
    upload.batchPosition = null;
    await upload.save();
    return apiSuccess({ removed: true, uploadId });
  } catch (error) {
    logSafeError("wardrobe.upload.batch.remove", error);
    return apiError("INTERNAL_ERROR", "Unable to remove this photo right now.");
  }
}
