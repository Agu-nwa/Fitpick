export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import {
  authenticateSupportApiRequest,
  createExternalSupportMessage,
  evaluateSupportApiQuota,
  listExternalSupportMessages,
  recordSupportApiUsage,
  supportApiHasScope
} from "@/lib/support-api/support-api-service";
import { readJson, validateBody } from "@/lib/validation";
import { supportApiConversationIdSchema, supportApiMessageCreateSchema, supportApiMessageListQuerySchema } from "@/schemas/support-api.schema";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-api-messages-get:${meta.ip}`, limit: 180, windowMs: 60_000, operation: "support-api-messages-get" });
  if (limited) return limited;

  try {
    await connectDB();
    const auth = await authenticateSupportApiRequest(request);
    if (!auth) return apiError("UNAUTHORIZED", "Provide a valid support API key.");
    if (!supportApiHasScope(auth, "messages:read")) {
      await recordSupportApiUsage({ auth, operation: "messages.list", method: "GET", path: request.nextUrl.pathname, statusCode: 403, billableUnits: 0 });
      return apiError("FORBIDDEN", "This API key cannot access that support API action.");
    }
    const quota = await evaluateSupportApiQuota(auth);
    if (!quota.allowed) {
      await recordSupportApiUsage({ auth, operation: "messages.list", method: "GET", path: request.nextUrl.pathname, statusCode: 429, billableUnits: 0 });
      return apiError("RATE_LIMITED", "This support API tenant has reached its monthly usage limit.");
    }
    const parsedParams = validateBody(supportApiConversationIdSchema, await params);
    if (!parsedParams.ok) return parsedParams.response;
    const parsedQuery = validateBody(supportApiMessageListQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsedQuery.ok) return parsedQuery.response;

    const result = await listExternalSupportMessages({
      tenantId: String(auth.tenant._id),
      conversationId: parsedParams.data.id,
      ...parsedQuery.data
    });
    await recordSupportApiUsage({ auth, operation: "messages.list", method: "GET", path: request.nextUrl.pathname, statusCode: 200 });
    return apiSuccess(result);
  } catch (error) {
    logSafeError("support-api.messages.get", error);
    if (error instanceof Error && error.message === "external_support_conversation_not_found") return apiError("NOT_FOUND", "Conversation not found.");
    return apiError("INTERNAL_ERROR", "Unable to load messages right now.");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-api-messages-post:${meta.ip}`, limit: 180, windowMs: 60_000, operation: "support-api-messages-post" });
  if (limited) return limited;

  try {
    await connectDB();
    const auth = await authenticateSupportApiRequest(request);
    if (!auth) return apiError("UNAUTHORIZED", "Provide a valid support API key.");
    if (!supportApiHasScope(auth, "messages:write")) {
      await recordSupportApiUsage({ auth, operation: "messages.create", method: "POST", path: request.nextUrl.pathname, statusCode: 403, billableUnits: 0 });
      return apiError("FORBIDDEN", "This API key cannot access that support API action.");
    }
    const quota = await evaluateSupportApiQuota(auth);
    if (!quota.allowed) {
      await recordSupportApiUsage({ auth, operation: "messages.create", method: "POST", path: request.nextUrl.pathname, statusCode: 429, billableUnits: 0 });
      return apiError("RATE_LIMITED", "This support API tenant has reached its monthly usage limit.");
    }
    const parsedParams = validateBody(supportApiConversationIdSchema, await params);
    if (!parsedParams.ok) return parsedParams.response;
    const parsedBody = validateBody(supportApiMessageCreateSchema, await readJson(request));
    if (!parsedBody.ok) return parsedBody.response;

    const message = await createExternalSupportMessage({
      tenantId: String(auth.tenant._id),
      conversationId: parsedParams.data.id,
      senderType: "customer",
      ...parsedBody.data
    });
    await recordSupportApiUsage({ auth, operation: "messages.create", method: "POST", path: request.nextUrl.pathname, statusCode: 201 });
    return apiSuccess({ message }, { message: "Message sent.", status: 201 });
  } catch (error) {
    logSafeError("support-api.messages.post", error);
    if (error instanceof Error && error.message === "external_support_conversation_not_found") return apiError("NOT_FOUND", "Conversation not found.");
    return apiError("INTERNAL_ERROR", "Unable to send message right now.");
  }
}
