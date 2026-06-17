import { apiSuccess } from "@/lib/api-response";
import { hasMongoUri } from "@/lib/db";

export async function GET() {
  return apiSuccess({
    service: "fitpick-api",
    status: "ok",
    databaseConfigured: hasMongoUri(),
    timestamp: new Date().toISOString()
  });
}
