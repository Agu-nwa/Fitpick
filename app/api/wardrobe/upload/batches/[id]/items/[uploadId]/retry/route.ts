export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { requestMeta } from "@/lib/audit";
import { backgroundJobsEnabled, enqueueJob, serializeJob } from "@/lib/jobs/queue";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { isObjectId } from "@/lib/wardrobe";
import { BackgroundJob } from "@/models/BackgroundJob";
import { WardrobeUpload } from "@/models/WardrobeUpload";
import { WardrobeUploadBatch } from "@/models/WardrobeUploadBatch";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; uploadId: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-batch-retry:${meta.ip}`, limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const { id, uploadId } = await context.params;
    if (!isObjectId(id) || !isObjectId(uploadId)) return apiError("NOT_FOUND", "Batch item was not found.");
    const [batch, upload] = await Promise.all([
      WardrobeUploadBatch.findOne({ _id: id, userId: auth.user._id, uploadIds: uploadId }),
      WardrobeUpload.findOne({ _id: uploadId, userId: auth.user._id, batchId: id })
    ]);
    if (!batch || !upload) return apiError("NOT_FOUND", "Batch item was not found.");
    if (upload.createdItemId) return apiError("CONFLICT", "This item is already saved.");
    if (!backgroundJobsEnabled()) return apiError("CONFLICT", "Automatic analysis is unavailable. Continue with manual review.");
    const active = await BackgroundJob.findOne({ userId: auth.user._id, type: "wardrobe_analysis", "payload.uploadId": uploadId, status: { $in: ["queued", "processing"] } }).lean();
    if (active) return apiSuccess({ job: serializeJob(active), alreadyRunning: true });
    upload.aiTagStatus = "queued";
    upload.aiErrorSafeMessage = "";
    await upload.save();
    const job = await enqueueJob("wardrobe_analysis", { uploadId, batchId: id, source: "batch_manual_retry" }, { userId: auth.user._id, maxAttempts: 3 });
    return apiSuccess({ job: serializeJob(job), alreadyRunning: false }, { message: "Analysis queued again." });
  } catch (error) {
    logSafeError("wardrobe.upload.batch.retry", error);
    return apiError("INTERNAL_ERROR", "Unable to retry this item right now.");
  }
}
