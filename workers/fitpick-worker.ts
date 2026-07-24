import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

let stopping = false;
const workerId = `fitpick-worker:${process.pid}:${Date.now().toString(36)}`;

function loadWorkerEnv() {
  const mode = process.env.NODE_ENV || "development";
  const candidates = [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"];
  const loaded: string[] = [];

  for (const filename of candidates) {
    const envPath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(envPath)) continue;
    dotenv.config({ path: envPath, override: false, quiet: true });
    loaded.push(filename);
  }

  console.info("fitpick.worker", {
    status: "env_loaded",
    files: loaded,
    mode,
    timestamp: new Date().toISOString()
  });
}

function safeErrorCategory(error: unknown) {
  if (error && typeof error === "object") {
    const name = "name" in error ? String((error as { name?: unknown }).name || "") : "";
    if (name === "ENV_CONFIGURATION_ERROR" || "missing" in error) return "configuration";
  }
  return "runtime";
}

function safeMissingVariables(error: unknown) {
  if (!error || typeof error !== "object" || !("missing" in error)) return undefined;
  const missing = (error as { missing?: unknown }).missing;
  return Array.isArray(missing) ? missing.map(String).filter(Boolean) : undefined;
}

function parsePollMs() {
  const value = Number(process.env.WORKER_POLL_MS || 5000);
  return Number.isFinite(value) && value >= 1000 ? value : 5000;
}

function parseLeaseMs() {
  const value = Number(process.env.WORKER_LEASE_MS || 5 * 60_000);
  return Number.isFinite(value) && value >= 30_000 ? Math.min(value, 30 * 60_000) : 5 * 60_000;
}

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

async function processOneJob(runtime: Awaited<ReturnType<typeof loadRuntime>>) {
  const leaseMs = parseLeaseMs();
  const job = await runtime.claimNextJob({ workerId, leaseMs });
  if (!job) return false;

  const heartbeat = setInterval(() => {
    void runtime.heartbeatJob(String(job._id), workerId, leaseMs);
  }, Math.max(10_000, Math.floor(leaseMs / 3)));

  try {
    const result = await runtime.runBackgroundJobByType(job);
    await runtime.updateJobStatus(String(job._id), "completed", {
      result,
      errorMessage: ""
    });
    runtime.logJobEvent({ event: "job_completed", jobId: String(job._id), type: job.type, status: "completed", attempts: job.attempts });
  } catch (error) {
    const message = job.type === "avatar_preview_generation"
      ? "Virtual Try-On could not be completed. Your credit was not deducted."
      : "Background job failed safely.";
    runtime.logJobEvent({
      event: "job_failed",
      jobId: String(job._id),
      type: job.type,
      status: "failed",
      attempts: job.attempts,
      errorCategory: runtime.errorCategory(error)
    });
    const retryable = runtime.isRetryableBackgroundJobFailure(job, error);
    const updated = await runtime.scheduleJobRetry(job, message, {
      retryable,
      errorCategory: runtime.errorCategory(error)
    });
    if (updated?.status === "dead_letter") {
      await runtime.handleTerminalBackgroundJobFailure(updated, "dead_letter", message);
    }
  } finally {
    clearInterval(heartbeat);
  }

  return true;
}

async function loadRuntime() {
  const env = await import("../lib/config/env");

  const envStatus = env.validateEnv({ strict: process.env.NODE_ENV === "production" });
  if (!envStatus.ok && process.env.NODE_ENV === "production") {
    throw new env.EnvConfigurationError(envStatus.missing);
  }

  const [{ connectDB }, queue, handlers, logger] = await Promise.all([
    import("../lib/db"),
    import("../lib/jobs/queue"),
    import("../lib/jobs/handlers"),
    import("../lib/ai/observability/ai-logger")
  ]);

  return {
    connectDB,
    claimNextJob: queue.claimNextJob,
    heartbeatJob: queue.heartbeatJob,
    recoverStaleProcessingJobs: queue.recoverStaleProcessingJobs,
    scheduleJobRetry: queue.scheduleJobRetry,
    updateJobStatus: queue.updateJobStatus,
    runBackgroundJobByType: handlers.runBackgroundJobByType,
    isRetryableBackgroundJobFailure: handlers.isRetryableBackgroundJobFailure,
    handleTerminalBackgroundJobFailure: handlers.handleTerminalBackgroundJobFailure,
    expireStaleTryOnGenerations: (await import("../lib/tryon/tryon-generation")).expireStaleTryOnGenerations,
    expireStaleReferenceFashionItems: (await import("../lib/ai/reference-fashion-item")).expireStaleReferenceFashionItems,
    errorCategory: logger.errorCategory,
    logJobEvent: logger.logJobEvent
  };
}

async function main() {
  loadWorkerEnv();

  if (process.env.ENABLE_BACKGROUND_JOBS !== "true") {
    console.info("fitpick.worker", {
      status: "disabled",
      message: "Background jobs are disabled. Set ENABLE_BACKGROUND_JOBS=true to run the worker.",
      timestamp: new Date().toISOString()
    });
    return;
  }

  const pollMs = parsePollMs();
  const runtime = await loadRuntime();
  await runtime.connectDB();
  console.info("fitpick.worker", { status: "started", pollMs, workerId, leaseMs: parseLeaseMs(), timestamp: new Date().toISOString() });

  let lastMaintenanceAt = 0;

  while (!stopping) {
    if (Date.now() - lastMaintenanceAt > 60_000) {
      lastMaintenanceAt = Date.now();
      const recovered = await runtime.recoverStaleProcessingJobs({ olderThanMs: parseLeaseMs(), limit: 25 });
      for (const job of recovered.deadLettered || []) {
        await runtime.handleTerminalBackgroundJobFailure(job, "stale_processing_dead_letter", "Background job expired before completion.");
      }
      const expired = await runtime.expireStaleTryOnGenerations({ olderThanMs: 90 * 60_000, limit: 50 });
      const expiredReferences = await runtime.expireStaleReferenceFashionItems({ limit: 50 });
      if (recovered.scanned || expired.expiredCount || expiredReferences.expiredCount || expiredReferences.retainedCount || expiredReferences.failedCount) {
        console.info("fitpick.worker", {
          status: "maintenance",
          recovered,
          expired,
          expiredReferences,
          workerId,
          timestamp: new Date().toISOString()
        });
      }
    }
    const worked = await processOneJob(runtime);
    if (!worked) {
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }

  console.info("fitpick.worker", { status: "stopped", timestamp: new Date().toISOString() });
}

main().catch((error) => {
  console.error("fitpick.worker", {
    status: "fatal",
    errorCategory: safeErrorCategory(error),
    missingVariables: safeMissingVariables(error),
    message: safeMissingVariables(error)?.length
      ? "Worker configuration is missing required environment variables. Add them to .env.local or the PM2 environment."
      : "Worker stopped because of a safe startup failure.",
    timestamp: new Date().toISOString()
  });
  process.exit(1);
});
