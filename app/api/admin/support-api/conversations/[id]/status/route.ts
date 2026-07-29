export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { updateAdminExternalSupportConversationStatus } from "@/lib/support-api/support-api-service";
import { readJson, validateBody } from "@/lib/validation";
import { adminSupportApiStatusPatchSchema, supportApiConversationIdSchema } from "@/schemas/support-api.schema";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-api-status-patch:${meta.ip}`, limit: 80, windowMs: 60_000, operation: "admin-support-api-status-patch" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const parsedParams = validateBody(supportApiConversationIdSchema, await params);
    if (!parsedParams.ok) return parsedParams.response;
    const parsedBody = validateBody(adminSupportApiStatusPatchSchema, await readJson(request));
    if (!parsedBody.ok) return parsedBody.response;

    await connectDB();
    const conversation = await updateAdminExternalSupportConversationStatus({ conversationId: parsedParams.data.id, status: parsedBody.data.status });
    return apiSuccess({ conversation }, { message: "Conversation updated." });
  } catch (error) {
    logSafeError("admin.support-api.status.patch", error);
    if (error instanceof Error && error.message === "external_support_conversation_not_found") return apiError("NOT_FOUND", "Conversation not found.");
    return apiError("INTERNAL_ERROR", "Unable to update API support conversation right now.");
  }
}
