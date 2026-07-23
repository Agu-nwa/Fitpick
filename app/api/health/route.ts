import { apiSuccess } from "@/lib/api-response";
import { connectDB, hasMongoUri } from "@/lib/db";
import { backgroundJobsEnabled, queueHealthSummary } from "@/lib/jobs/queue";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "skipped" | "degraded" | "not_checked";

function hasStorageConfig() {
  return Boolean(
    (process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET) &&
    (process.env.S3_REGION || process.env.AWS_REGION) &&
    (
      process.env.S3_PUBLIC_BASE_URL ||
      process.env.CLOUDFRONT_PUBLIC_URL ||
      process.env.CLOUDFRONT_URL ||
      process.env.NEXT_PUBLIC_CLOUDFRONT_URL
    )
  );
}

function timeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("health_check_timeout")), ms);
    })
  ]);
}

async function databaseStatus(): Promise<CheckStatus> {
  if (!hasMongoUri()) return "skipped";

  try {
    await timeout(connectDB(), 1500);
    return "ok";
  } catch {
    return "degraded";
  }
}

async function queueStatus(): Promise<{ worker: CheckStatus; queue: CheckStatus; summary: Awaited<ReturnType<typeof queueHealthSummary>> | null }> {
  if (!backgroundJobsEnabled()) return { worker: "skipped", queue: "skipped", summary: null };
  if (!hasMongoUri()) return { worker: "skipped", queue: "skipped", summary: null };

  try {
    const summary = await timeout(queueHealthSummary(), 1500);
    const staleHeartbeat = summary.processing > 0 && summary.latestHeartbeatMsAgo !== null && summary.latestHeartbeatMsAgo > 10 * 60_000;
    return {
      worker: staleHeartbeat ? "degraded" : "ok",
      queue: summary.deadLetter > 0 ? "degraded" : "ok",
      summary
    };
  } catch {
    return { worker: "degraded", queue: "degraded", summary: null };
  }
}

export async function GET() {
  const database = await databaseStatus();
  const jobs = await queueStatus();
  const storage: CheckStatus = hasStorageConfig() ? "ok" : "skipped";
  const now = new Date().toISOString();
  const status = database === "degraded" || jobs.worker === "degraded" || jobs.queue === "degraded" ? "degraded" : "ok";

  return apiSuccess({
    ok: true,
    service: "fitpick",
    version: packageJson.version || "0.0.0",
    deploymentId: process.env.NEXT_DEPLOYMENT_ID || "unknown",
    time: now,
    status,
    databaseConfigured: hasMongoUri(),
    timestamp: now,
    checks: {
      app: "ok" as const,
      database,
      storage,
      worker: jobs.worker,
      queue: jobs.queue,
    },
    queue: jobs.summary,
  });
}
