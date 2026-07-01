import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

let stopping = false;

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

process.on("SIGINT", () => {
  stopping = true;
});

process.on("SIGTERM", () => {
  stopping = true;
});

async function processOneJob(runtime: Awaited<ReturnType<typeof loadRuntime>>) {
  const job = await runtime.claimNextJob();
  if (!job) return false;

  try {
    const result = await runtime.runBackgroundJobByType(job);
    await runtime.updateJobStatus(String(job._id), "completed", {
      result,
      errorMessage: ""
    });
    runtime.logJobEvent({ event: "job_completed", jobId: String(job._id), type: job.type, status: "completed", attempts: job.attempts });
  } catch (error) {
    const message = "Background job failed safely.";
    runtime.logJobEvent({
      event: "job_failed",
      jobId: String(job._id),
      type: job.type,
      status: "failed",
      attempts: job.attempts,
      errorCategory: runtime.errorCategory(error)
    });
    await runtime.scheduleJobRetry(job, message);
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
    scheduleJobRetry: queue.scheduleJobRetry,
    updateJobStatus: queue.updateJobStatus,
    runBackgroundJobByType: handlers.runBackgroundJobByType,
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
  console.info("fitpick.worker", { status: "started", pollMs, timestamp: new Date().toISOString() });

  while (!stopping) {
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
