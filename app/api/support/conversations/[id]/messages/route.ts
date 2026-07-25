export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { isSupportChatEnabled } from "@/lib/support/config";
import { createSupportMessage, getSupportConversationForActor, listSupportMessages } from "@/lib/support/support-service";
import { readJson, validateBody } from "@/lib/validation";
import { supportConversationIdSchema, supportMessageBodySchema } from "@/schemas/support.schema";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-messages-get:${meta.ip}`, limit: 80, windowMs: 60_000, operation: "support-messages-get" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const params = validateBody(supportConversationIdSchema, await context.params);
    if (!params.ok) return params.response;

    await connectDB();
    const conversation = await getSupportConversationForActor({ conversationId: params.data.id, actor: { userId: String(auth.user._id), role: auth.user.role } });
    if (!conversation) return apiError("NOT_FOUND", "Support conversation not found.");
    const page = await listSupportMessages({ conversationId: params.data.id, cursor: request.nextUrl.searchParams.get("cursor"), limit: 30 });
    return apiSuccess(page);
  } catch (error) {
    logSafeError("support.messages.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load messages right now.");
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-message-post:${meta.ip}`, limit: 30, windowMs: 60_000, operation: "support-message-post" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const params = validateBody(supportConversationIdSchema, await context.params);
    if (!params.ok) return params.response;
    const parsed = validateBody(supportMessageBodySchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    await connectDB();
    const result = await createSupportMessage({
      conversationId: params.data.id,
      actor: { userId: String(auth.user._id), role: auth.user.role },
      body: parsed.data.body,
      attachments: parsed.data.attachments,
      idempotencyKey: parsed.data.idempotencyKey
    });
    return apiSuccess(result, { status: result.deduplicated ? 200 : 201 });
  } catch (error) {
    logSafeError("support.messages.post", error);
    return apiError("INTERNAL_ERROR", "Unable to send your message right now.");
  }
}
