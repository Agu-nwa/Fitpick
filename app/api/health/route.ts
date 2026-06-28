import { apiSuccess } from "@/lib/api-response";
import { connectDB, hasMongoUri } from "@/lib/db";
import packageJson from "@/package.json";

export const dynamic = "force-dynamic";

type CheckStatus = "ok" | "skipped" | "degraded" | "not_checked";

function hasStorageConfig() {
  return Boolean(
    (process.env.S3_BUCKET || process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET) &&
    (process.env.S3_REGION || process.env.AWS_REGION) &&
    (process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
    (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)
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

export async function GET() {
  const database = await databaseStatus();
  const storage: CheckStatus = hasStorageConfig() ? "ok" : "skipped";
  const now = new Date().toISOString();

  return apiSuccess({
    ok: true,
    service: "fitpick",
    version: packageJson.version || "0.0.0",
    time: now,
    status: database === "degraded" ? "degraded" : "ok",
    databaseConfigured: hasMongoUri(),
    timestamp: now,
    checks: {
      app: "ok" as const,
      database,
      storage,
      worker: "not_checked" as const
    }
  });
}
