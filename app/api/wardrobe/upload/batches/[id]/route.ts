export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId, serializeWardrobeUpload } from "@/lib/wardrobe";
import { WardrobeUpload } from "@/models/WardrobeUpload";
import { WardrobeUploadBatch } from "@/models/WardrobeUploadBatch";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-batch-detail:${meta.ip}`, limit: 60, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!isObjectId(id)) return apiError("NOT_FOUND", "Upload batch was not found.");
    const batch = await WardrobeUploadBatch.findOne({ _id: id, userId: auth.user._id });
    if (!batch) return apiError("NOT_FOUND", "Upload batch was not found.");
    const uploads = await WardrobeUpload.find({ _id: { $in: batch.uploadIds }, userId: auth.user._id }).sort({ batchPosition: 1 });
    const completed = uploads.filter((upload) => upload.createdItemId).length;
    const reviewable = uploads.filter((upload) => ["not_started", "suggested", "needs-review", "failed"].includes(upload.aiTagStatus)).length;
    const status = completed === uploads.length ? "completed" : reviewable + completed === uploads.length ? "review" : "processing";
    if (batch.status !== status) { batch.status = status; await batch.save(); }
    return apiSuccess({ batch: { id: String(batch._id), status, itemCount: batch.itemCount, completedCount: completed, reviewableCount: reviewable, uploads: uploads.map(serializeWardrobeUpload) } });
  } catch (error) {
    logSafeError("wardrobe.upload.batch.detail", error);
    return apiError("INTERNAL_ERROR", "Unable to load this upload batch right now.");
  }
}
