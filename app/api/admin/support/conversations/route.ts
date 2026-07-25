export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { isSupportChatEnabled } from "@/lib/support/config";
import { listAdminSupportConversations } from "@/lib/support/support-service";
import { validateBody } from "@/lib/validation";
import { adminSupportListQuerySchema } from "@/schemas/support.schema";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-list:${meta.ip}`, limit: 80, windowMs: 60_000, operation: "admin-support-list" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const parsed = validateBody(adminSupportListQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.ok) return parsed.response;
    await connectDB();
    const conversations = await listAdminSupportConversations(parsed.data);
    return apiSuccess({ conversations });
  } catch (error) {
    logSafeError("admin.support.conversations", error);
    return apiError("INTERNAL_ERROR", "Unable to load support inbox right now.");
  }
}
