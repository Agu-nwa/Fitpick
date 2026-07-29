export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { createAdminExternalSupportMessage, getAdminExternalSupportConversation, listExternalSupportMessages } from "@/lib/support-api/support-api-service";
import { readJson, validateBody } from "@/lib/validation";
import { supportApiConversationIdSchema, supportApiMessageCreateSchema, supportApiMessageListQuerySchema } from "@/schemas/support-api.schema";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-api-messages-get:${meta.ip}`, limit: 120, windowMs: 60_000, operation: "admin-support-api-messages-get" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const parsedParams = validateBody(supportApiConversationIdSchema, await params);
    if (!parsedParams.ok) return parsedParams.response;
    const parsedQuery = validateBody(supportApiMessageListQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsedQuery.ok) return parsedQuery.response;

    await connectDB();
    const conversation = await getAdminExternalSupportConversation({ conversationId: parsedParams.data.id });
    if (!conversation) return apiError("NOT_FOUND", "Conversation not found.");
    const result = await listExternalSupportMessages({ tenantId: conversation.tenantId, conversationId: parsedParams.data.id, ...parsedQuery.data });
    return apiSuccess({ conversation, ...result });
  } catch (error) {
    logSafeError("admin.support-api.messages.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load API support messages right now.");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `admin-support-api-messages-post:${meta.ip}`, limit: 120, windowMs: 60_000, operation: "admin-support-api-messages-post" });
  if (limited) return limited;

  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const parsedParams = validateBody(supportApiConversationIdSchema, await params);
    if (!parsedParams.ok) return parsedParams.response;
    const parsedBody = validateBody(supportApiMessageCreateSchema, await readJson(request));
    if (!parsedBody.ok) return parsedBody.response;

    await connectDB();
    const message = await createAdminExternalSupportMessage({
      conversationId: parsedParams.data.id,
      senderName: auth.user.name || "Support",
      body: parsedBody.data.body,
      idempotencyKey: parsedBody.data.idempotencyKey
    });
    const conversation = await getAdminExternalSupportConversation({ conversationId: parsedParams.data.id });
    return apiSuccess({ message, conversation }, { message: "Reply sent.", status: 201 });
  } catch (error) {
    logSafeError("admin.support-api.messages.post", error);
    if (error instanceof Error && error.message === "external_support_conversation_not_found") return apiError("NOT_FOUND", "Conversation not found.");
    return apiError("INTERNAL_ERROR", "Unable to send API support reply right now.");
  }
}
