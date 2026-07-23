import type { Types } from "mongoose";
import { BackgroundJob } from "@/models/BackgroundJob";
import { logJobEvent } from "@/lib/ai/observability/ai-logger";
import { logTryOnMetric, tryOnBackoffDelay } from "@/lib/tryon/reliability";
import { safeUserMessage, sanitizeUserFacingPayload } from "@/lib/user-facing-errors";

export type BackgroundJobType =
  | "wardrobe_analysis"
  | "wardrobe_enrichment"
  | "label_ocr"
  | "outfit_preview_generation"
  | "avatar_preview_generation"
  | "garment_asset_generation"
  | "fit_locked_preview_generation"
  | "true_3d_tryon_generation"
  | "style_profile_learning"
  | "memory_rollup";

export type BackgroundJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled" | "dead_letter";

type EnqueueOptions = {
  userId: string | Types.ObjectId;
  maxAttempts?: number;
  availableAt?: Date;
};

type ClaimOptions = {
  workerId?: string;
  leaseMs?: number;
};

type RetryOptions = {
  retryable?: boolean;
  errorCategory?: string;
};

function scrubPayload(payload: Record<string, unknown> = {}) {
  return JSON.parse(JSON.stringify(payload, (key, value) => {
    if (key !== "cacheKey" && /secret|token|key|base64|b64|signed/i.test(key)) return undefined;
    if (typeof value === "string" && value.length > 600) return value.slice(0, 600);
    return value;
  }));
}

export async function enqueueJob(type: BackgroundJobType, payload: Record<string, unknown>, options: EnqueueOptions) {
  const job = await BackgroundJob.create({
    userId: options.userId,
    type,
    status: "queued",
    payload: scrubPayload(payload),
    maxAttempts: Math.max(1, Math.min(options.maxAttempts || 3, 10)),
    availableAt: options.availableAt || new Date()
  });

  logJobEvent({ event: "job_enqueued", jobId: String(job._id), type, status: "queued" });
  return job;
}

export async function getJob(jobId: string, userId?: string | Types.ObjectId) {
  return BackgroundJob.findOne({
    _id: jobId,
    ...(userId ? { userId } : {})
  }).lean();
}

export async function updateJobStatus(jobId: string, status: BackgroundJobStatus, patch: Record<string, unknown> = {}) {
  const existing = await BackgroundJob.findById(jobId).lean();
  const now = new Date();
  const set: Record<string, unknown> = {
    ...patch,
    status
  };

  if (status === "processing") set.startedAt = now;
  if (status === "completed") set.completedAt = now;
  if (status === "failed") set.failedAt = now;
  if (status === "dead_letter") set.deadLetteredAt = now;
  if (["completed", "failed", "cancelled", "dead_letter"].includes(status)) {
    set.claimedBy = "";
    set.lockedAt = null;
    set.lockExpiresAt = null;
    set.lastHeartbeatAt = null;
    if (existing?.startedAt) {
      set.processingDurationMs = Math.max(0, now.getTime() - new Date(existing.startedAt).getTime());
    }
  }

  const job = await BackgroundJob.findByIdAndUpdate(jobId, { $set: set }, { new: true });
  if (job) logJobEvent({ event: `job_${status}`, jobId: String(job._id), type: job.type, status });
  return job;
}

export async function claimNextJob(options: ClaimOptions = {}) {
  const now = new Date();
  const leaseMs = Math.max(30_000, Math.min(options.leaseMs || 5 * 60_000, 30 * 60_000));
  const workerId = String(options.workerId || `worker:${process.pid}`);
  const job = await BackgroundJob.findOneAndUpdate(
    {
      status: "queued",
      availableAt: { $lte: now },
      $expr: { $lt: ["$attempts", "$maxAttempts"] }
    },
    {
      $set: {
        status: "processing",
        startedAt: now,
        claimedBy: workerId,
        lockedAt: now,
        lockExpiresAt: new Date(now.getTime() + leaseMs),
        lastHeartbeatAt: now,
        errorMessage: ""
      },
      $inc: { attempts: 1 }
    },
    {
      sort: { availableAt: 1, createdAt: 1 },
      new: true
    }
  );

  if (job) {
    const queueWaitMs = job.createdAt ? Math.max(0, now.getTime() - new Date(job.createdAt).getTime()) : 0;
    if (queueWaitMs !== job.queueWaitMs) {
      await BackgroundJob.findByIdAndUpdate(job._id, { $set: { queueWaitMs } });
      job.queueWaitMs = queueWaitMs;
    }
    logJobEvent({ event: "job_claimed", jobId: String(job._id), type: job.type, status: "processing", attempts: job.attempts });
    if (job.type === "avatar_preview_generation") {
      logTryOnMetric({
        metric: "queue_wait",
        stage: "queue",
        status: "success",
        durationMs: queueWaitMs,
        attempt: job.attempts,
        metadata: { jobId: String(job._id), jobType: job.type }
      });
    }
  }
  return job;
}

export async function heartbeatJob(jobId: string, workerId: string, leaseMs = 5 * 60_000) {
  const now = new Date();
  return BackgroundJob.findOneAndUpdate(
    {
      _id: jobId,
      status: "processing",
      claimedBy: workerId
    },
    {
      $set: {
        lastHeartbeatAt: now,
        lockExpiresAt: new Date(now.getTime() + Math.max(30_000, leaseMs))
      }
    },
    { new: true }
  );
}

export async function markJobDeadLetter(job: any, errorMessage: string, patch: Record<string, unknown> = {}) {
  logJobEvent({ event: "job_dead_letter", jobId: String(job._id), type: job.type, status: "dead_letter", attempts: Number(job.attempts || 0) });
  return updateJobStatus(String(job._id), "dead_letter", {
    ...patch,
    errorMessage,
    failedAt: new Date(),
    deadLetteredAt: new Date()
  });
}

export async function scheduleJobRetry(job: any, errorMessage: string, options: RetryOptions = {}) {
  const attempts = Number(job.attempts || 0);
  const maxAttempts = Number(job.maxAttempts || 3);

  if (options.retryable === false || attempts >= maxAttempts) {
    logJobEvent({ event: "job_max_attempts", jobId: String(job._id), type: job.type, status: "dead_letter", attempts, errorCategory: options.errorCategory });
    return markJobDeadLetter(job, errorMessage, {
      "result.failureKind": options.retryable === false ? "permanent" : "max_attempts",
      "result.errorCategory": options.errorCategory || ""
    });
  }

  const delayMs = Math.min(30 * 60_000, tryOnBackoffDelay(30_000, Math.max(0, attempts - 1), 30 * 60_000));
  const availableAt = new Date(Date.now() + delayMs);
  const updated = await BackgroundJob.findByIdAndUpdate(
    job._id,
    {
      $set: {
        status: "queued",
        availableAt,
        errorMessage,
        claimedBy: "",
        lockedAt: null,
        lockExpiresAt: null,
        lastHeartbeatAt: null
      }
    },
    { new: true }
  );

  logJobEvent({ event: "job_retry_scheduled", jobId: String(job._id), type: job.type, status: "queued", attempts });
  return updated;
}

export async function recoverStaleProcessingJobs(options: { olderThanMs?: number; limit?: number } = {}) {
  const olderThanMs = Math.max(60_000, Math.min(options.olderThanMs || 10 * 60_000, 60 * 60_000));
  const limit = Math.max(1, Math.min(options.limit || 25, 250));
  const now = new Date();
  const cutoff = new Date(now.getTime() - olderThanMs);
  const staleJobs = await BackgroundJob.find({
    status: "processing",
    $or: [
      { lockExpiresAt: { $lte: now } },
      { lockExpiresAt: null, updatedAt: { $lte: cutoff } }
    ]
  }).sort({ updatedAt: 1 }).limit(limit);

  let requeued = 0;
  const deadLettered: any[] = [];
  for (const job of staleJobs) {
    const attempts = Number(job.attempts || 0);
    const maxAttempts = Number(job.maxAttempts || 3);
    if (attempts >= maxAttempts) {
      const dead = await markJobDeadLetter(job, "Background job lease expired after maximum attempts.", {
        "result.failureKind": "stale_processing_max_attempts"
      });
      if (dead) deadLettered.push(dead);
      continue;
    }
    await BackgroundJob.findByIdAndUpdate(job._id, {
      $set: {
        status: "queued",
        availableAt: now,
        errorMessage: "Worker lease expired; retrying safely.",
        claimedBy: "",
        lockedAt: null,
        lockExpiresAt: null,
        lastHeartbeatAt: null
      }
    });
    requeued += 1;
    logJobEvent({ event: "job_recovered", jobId: String(job._id), type: job.type, status: "queued", attempts });
  }

  return { scanned: staleJobs.length, requeued, deadLettered };
}

export async function queueHealthSummary() {
  const counts = await BackgroundJob.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);
  const byStatus = Object.fromEntries(counts.map((entry) => [entry._id || "unknown", entry.count]));
  const oldestQueued = await BackgroundJob.findOne({ status: "queued" }).sort({ availableAt: 1, createdAt: 1 }).select("availableAt createdAt").lean();
  const activeProcessing = await BackgroundJob.findOne({ status: "processing" }).sort({ lastHeartbeatAt: -1, updatedAt: -1 }).select("lastHeartbeatAt lockExpiresAt updatedAt").lean();
  const now = Date.now();
  const oldestQueueWaitMs = oldestQueued?.createdAt ? Math.max(0, now - new Date(oldestQueued.createdAt).getTime()) : 0;
  const latestHeartbeatMsAgo = activeProcessing?.lastHeartbeatAt ? Math.max(0, now - new Date(activeProcessing.lastHeartbeatAt).getTime()) : null;

  return {
    byStatus,
    queued: Number(byStatus.queued || 0),
    processing: Number(byStatus.processing || 0),
    completed: Number(byStatus.completed || 0),
    failed: Number(byStatus.failed || 0),
    deadLetter: Number(byStatus.dead_letter || 0),
    oldestQueueWaitMs,
    latestHeartbeatMsAgo
  };
}

export function serializeJob(job: any) {
  return {
    id: String(job._id),
    type: job.type,
    status: job.status,
    attempts: job.attempts || 0,
    maxAttempts: job.maxAttempts || 0,
    result: sanitizeUserFacingPayload(job.result || {}),
    errorMessage: job.errorMessage ? safeUserMessage(job.errorMessage, "Something went wrong. Please try again shortly.") : "",
    claimedBy: job.claimedBy || "",
    queueWaitMs: job.queueWaitMs || 0,
    processingDurationMs: job.processingDurationMs || 0,
    availableAt: job.availableAt ? new Date(job.availableAt).toISOString() : null,
    startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : null,
    lockedAt: job.lockedAt ? new Date(job.lockedAt).toISOString() : null,
    lockExpiresAt: job.lockExpiresAt ? new Date(job.lockExpiresAt).toISOString() : null,
    lastHeartbeatAt: job.lastHeartbeatAt ? new Date(job.lastHeartbeatAt).toISOString() : null,
    completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : null,
    failedAt: job.failedAt ? new Date(job.failedAt).toISOString() : null,
    deadLetteredAt: job.deadLetteredAt ? new Date(job.deadLetteredAt).toISOString() : null,
    createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
    updatedAt: job.updatedAt ? new Date(job.updatedAt).toISOString() : null
  };
}

export function backgroundJobsEnabled() {
  return process.env.ENABLE_BACKGROUND_JOBS === "true";
}
