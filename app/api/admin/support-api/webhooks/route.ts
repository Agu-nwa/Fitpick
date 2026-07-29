export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { listSupportWebhookEvents } from "@/lib/support-api/webhooks";
import { validateBody } from "@/lib/validation";
import { adminSupportApiWebhookListQuerySchema } from "@/schemas/support-api.schema";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-api-webhooks-get:${meta.ip}`, limit: 80, windowMs: 60_000, operation: "admin-support-api-webhooks-get" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(adminSupportApiWebhookListQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.ok) return parsed.response;
    await connectDB();
    const events = await listSupportWebhookEvents(parsed.data);
    return apiSuccess({ events });
  } catch (error) {
    logSafeError("admin.support-api.webhooks.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load webhook events right now.");
  }
}
