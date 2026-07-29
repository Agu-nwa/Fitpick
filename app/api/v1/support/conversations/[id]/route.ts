export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { authenticateSupportApiRequest, evaluateSupportApiQuota, getExternalSupportConversation, recordSupportApiUsage, supportApiHasScope } from "@/lib/support-api/support-api-service";
import { validateBody } from "@/lib/validation";
import { supportApiConversationIdSchema } from "@/schemas/support-api.schema";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-api-conversation-get:${meta.ip}`, limit: 180, windowMs: 60_000, operation: "support-api-conversation-get" });
  if (limited) return limited;

  try {
    await connectDB();
    const auth = await authenticateSupportApiRequest(request);
    if (!auth) return apiError("UNAUTHORIZED", "Provide a valid support API key.");
    if (!supportApiHasScope(auth, "conversations:read")) {
      await recordSupportApiUsage({ auth, operation: "conversations.retrieve", method: "GET", path: request.nextUrl.pathname, statusCode: 403, billableUnits: 0 });
      return apiError("FORBIDDEN", "This API key cannot access that support API action.");
    }
    const quota = await evaluateSupportApiQuota(auth);
    if (!quota.allowed) {
      await recordSupportApiUsage({ auth, operation: "conversations.retrieve", method: "GET", path: request.nextUrl.pathname, statusCode: 429, billableUnits: 0 });
      return apiError("RATE_LIMITED", "This support API tenant has reached its monthly usage limit.");
    }
    const parsed = validateBody(supportApiConversationIdSchema, await params);
    if (!parsed.ok) return parsed.response;

    const conversation = await getExternalSupportConversation({ tenantId: String(auth.tenant._id), conversationId: parsed.data.id });
    if (!conversation) {
      await recordSupportApiUsage({ auth, operation: "conversations.retrieve", method: "GET", path: request.nextUrl.pathname, statusCode: 404, billableUnits: 0 });
      return apiError("NOT_FOUND", "Conversation not found.");
    }
    await recordSupportApiUsage({ auth, operation: "conversations.retrieve", method: "GET", path: request.nextUrl.pathname, statusCode: 200 });
    return apiSuccess({ conversation });
  } catch (error) {
    logSafeError("support-api.conversation.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load conversation right now.");
  }
}
