export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { listAdminExternalSupportConversations } from "@/lib/support-api/support-api-service";
import { validateBody } from "@/lib/validation";
import { adminSupportApiConversationListQuerySchema } from "@/schemas/support-api.schema";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-api-conversations-get:${meta.ip}`, limit: 80, windowMs: 60_000, operation: "admin-support-api-conversations-get" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const parsed = validateBody(adminSupportApiConversationListQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.ok) return parsed.response;

    await connectDB();
    const conversations = await listAdminExternalSupportConversations(parsed.data);
    return apiSuccess({ conversations });
  } catch (error) {
    logSafeError("admin.support-api.conversations.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load API support conversations right now.");
  }
}
