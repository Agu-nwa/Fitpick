export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { isSupportChatEnabled, supportPublicRuntimeConfig } from "@/lib/support/config";
import { findActiveSupportConversation, getOrCreateSupportConversation, listSupportMessages, serializeSupportConversation } from "@/lib/support/support-service";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-conversation-get:${meta.ip}`, limit: 60, windowMs: 60_000, operation: "support-conversation-get" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiSuccess({ conversation: null, messages: [], config: supportPublicRuntimeConfig() });

    await connectDB();
    const conversation = await findActiveSupportConversation(String(auth.user._id));
    if (!conversation) return apiSuccess({ conversation: null, messages: [], config: supportPublicRuntimeConfig() });
    const messages = await listSupportMessages({ conversationId: String(conversation._id), limit: 30 });
    return apiSuccess({ conversation: serializeSupportConversation(conversation), messages: messages.messages, nextCursor: messages.nextCursor, config: supportPublicRuntimeConfig() });
  } catch (error) {
    logSafeError("support.conversation.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load support right now.");
  }
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-conversation-post:${meta.ip}`, limit: 10, windowMs: 60_000, operation: "support-conversation-post" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });

    await connectDB();
    const conversation = await getOrCreateSupportConversation(String(auth.user._id));
    return apiSuccess({ conversation: serializeSupportConversation(conversation), config: supportPublicRuntimeConfig() }, { status: 201 });
  } catch (error) {
    logSafeError("support.conversation.post", error);
    return apiError("INTERNAL_ERROR", "Unable to start support chat right now.");
  }
}
