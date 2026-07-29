export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { retrySupportWebhookEvent } from "@/lib/support-api/webhooks";
import { validateBody } from "@/lib/validation";
import { supportApiWebhookEventIdSchema } from "@/schemas/support-api.schema";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-api-webhooks-retry:${meta.ip}`, limit: 40, windowMs: 60_000, operation: "admin-support-api-webhooks-retry" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(supportApiWebhookEventIdSchema, await params);
    if (!parsed.ok) return parsed.response;
    await connectDB();
    const event = await retrySupportWebhookEvent({ eventId: parsed.data.id });
    return apiSuccess({ event }, { message: "Webhook delivery retried." });
  } catch (error) {
    logSafeError("admin.support-api.webhooks.retry", error);
    if (error instanceof Error && error.message === "support_webhook_event_not_found") return apiError("NOT_FOUND", "Webhook event not found.");
    return apiError("INTERNAL_ERROR", "Unable to retry webhook event right now.");
  }
}
