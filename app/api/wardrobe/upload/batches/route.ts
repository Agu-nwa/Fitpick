export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { backgroundJobsEnabled, enqueueJob, serializeJob } from "@/lib/jobs/queue";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { serializeWardrobeUpload } from "@/lib/wardrobe";
import { validateWardrobeBatchCandidates } from "@/lib/wardrobe/batch-upload";
import { perceptualHashDistance } from "@/lib/image-processing/perceptual-hash";
import { WardrobeItem } from "@/models/WardrobeItem";
import { WardrobeUpload } from "@/models/WardrobeUpload";
import { WardrobeUploadBatch } from "@/models/WardrobeUploadBatch";
import { wardrobeUploadBatchSchema } from "@/schemas/wardrobe.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `wardrobe-batch:${meta.ip}`, limit: 8, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(wardrobeUploadBatchSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const uploadIds = parsed.data.uploadIds;

    const uploads = await WardrobeUpload.find({ _id: { $in: uploadIds }, userId: auth.user._id });
    if (uploads.length !== uploadIds.length) return apiError("NOT_FOUND", "One or more uploads were not found.");
    const ordered = uploadIds.map((id) => uploads.find((upload) => String(upload._id) === id)!);
    const validation = validateWardrobeBatchCandidates(ordered.map((upload) => ({
      id: String(upload._id),
      sizeBytes: upload.sizeBytes,
      sourceImageHash: upload.sourceImageHash,
      perceptualImageHash: upload.perceptualImageHash,
      uploadStatus: upload.uploadStatus,
      createdItemId: upload.createdItemId,
      batchId: upload.batchId
    })));
    if (!validation.ok) {
      return apiError(validation.code === "invalid_state" || validation.code === "duplicate_photo" ? "CONFLICT" : "VALIDATION_ERROR", validation.message);
    }

    const { hashes } = validation;
    const perceptualHashes = ordered.map((upload) => upload.perceptualImageHash).filter((hash): hash is string => Boolean(hash));
    for (let left = 0; left < perceptualHashes.length; left += 1) {
      for (let right = left + 1; right < perceptualHashes.length; right += 1) {
        if (perceptualHashDistance(perceptualHashes[left], perceptualHashes[right]) <= 5) {
          return apiError("CONFLICT", "Two photos appear to show the same closet item.");
        }
      }
    }
    if (hashes.length) {
      const existing = await WardrobeItem.findOne({ userId: auth.user._id, archivedAt: null, sourceImageHash: { $in: hashes } }).select("_id").lean();
      if (existing) return apiError("CONFLICT", "One of these photos is already saved in your closet.");
    }
    if (perceptualHashes.length) {
      const existingHashes = await WardrobeItem.find({
        userId: auth.user._id,
        archivedAt: null,
        perceptualImageHash: { $ne: "" }
      }).select("perceptualImageHash").lean();
      const looksDuplicated = perceptualHashes.some((candidate) => existingHashes.some((item) =>
        perceptualHashDistance(candidate, String(item.perceptualImageHash || "")) <= 5
      ));
      if (looksDuplicated) return apiError("CONFLICT", "One of these items appears to already be in your closet.");
    }

    const batch = await WardrobeUploadBatch.create({
      userId: auth.user._id,
      uploadIds: ordered.map((upload) => upload._id),
      itemCount: ordered.length,
      status: "processing"
    });

    await Promise.all(ordered.map((upload, position) => WardrobeUpload.updateOne(
      { _id: upload._id, userId: auth.user._id },
      { $set: { batchId: batch._id, batchPosition: position } }
    )));

    const jobs = [];
    if (backgroundJobsEnabled()) {
      for (let position = 0; position < ordered.length; position += 1) {
        const upload = ordered[position];
        await WardrobeUpload.updateOne({ _id: upload._id }, { $set: { aiTagStatus: "queued", aiErrorSafeMessage: "" } });
        const job = await enqueueJob("wardrobe_analysis", { uploadId: String(upload._id), batchId: String(batch._id) }, {
          userId: auth.user._id,
          maxAttempts: 3,
          availableAt: new Date(Date.now() + position * 1_000)
        });
        jobs.push(serializeJob(job));
      }
    }

    await recordAuditEvent({ request, userId: String(auth.user._id), action: "wardrobe.upload", entityType: "WardrobeUploadBatch", entityId: String(batch._id) });
    const refreshed = await WardrobeUpload.find({ _id: { $in: uploadIds }, userId: auth.user._id });
    return apiSuccess({
      batch: { id: String(batch._id), status: batch.status, itemCount: batch.itemCount, uploads: uploadIds.map((id) => serializeWardrobeUpload(refreshed.find((upload) => String(upload._id) === id))) },
      jobs,
      nextAction: `/wardrobe/bulk-upload/${batch._id}`
    }, { message: "Your items are being prepared for review.", status: 201 });
  } catch (error) {
    logSafeError("wardrobe.upload.batch.create", error);
    return apiError("INTERNAL_ERROR", "Unable to prepare these closet items right now.");
  }
}
