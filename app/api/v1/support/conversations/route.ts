export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { connectDB } from "@/lib/db";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import {
  authenticateSupportApiRequest,
  createExternalSupportConversation,
  evaluateSupportApiQuota,
  listExternalSupportConversations,
  recordSupportApiUsage,
  supportApiHasScope
} from "@/lib/support-api/support-api-service";
import { readJson, validateBody } from "@/lib/validation";
import { supportApiConversationCreateSchema, supportApiConversationListQuerySchema } from "@/schemas/support-api.schema";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-api-conversations-get:${meta.ip}`, limit: 120, windowMs: 60_000, operation: "support-api-conversations-get" });
  if (limited) return limited;

  try {
    await connectDB();
    const auth = await authenticateSupportApiRequest(request);
    if (!auth) return apiError("UNAUTHORIZED", "Provide a valid support API key.");
    if (!supportApiHasScope(auth, "conversations:read")) {
      await recordSupportApiUsage({ auth, operation: "conversations.list", method: "GET", path: request.nextUrl.pathname, statusCode: 403, billableUnits: 0 });
      return apiError("FORBIDDEN", "This API key cannot access that support API action.");
    }
    const quota = await evaluateSupportApiQuota(auth);
    if (!quota.allowed) {
      await recordSupportApiUsage({ auth, operation: "conversations.list", method: "GET", path: request.nextUrl.pathname, statusCode: 429, billableUnits: 0 });
      return apiError("RATE_LIMITED", "This support API tenant has reached its monthly usage limit.");
    }
    const parsed = validateBody(supportApiConversationListQuerySchema, Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.ok) return parsed.response;

    const conversations = await listExternalSupportConversations({
      tenantId: String(auth.tenant._id),
      ...parsed.data
    });
    await recordSupportApiUsage({ auth, operation: "conversations.list", method: "GET", path: request.nextUrl.pathname, statusCode: 200 });
    return apiSuccess({ conversations });
  } catch (error) {
    logSafeError("support-api.conversations.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load conversations right now.");
  }
}

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-api-conversations-post:${meta.ip}`, limit: 120, windowMs: 60_000, operation: "support-api-conversations-post" });
  if (limited) return limited;

  try {
    await connectDB();
    const auth = await authenticateSupportApiRequest(request);
    if (!auth) return apiError("UNAUTHORIZED", "Provide a valid support API key.");
    if (!supportApiHasScope(auth, "conversations:write")) {
      await recordSupportApiUsage({ auth, operation: "conversations.create", method: "POST", path: request.nextUrl.pathname, statusCode: 403, billableUnits: 0 });
      return apiError("FORBIDDEN", "This API key cannot access that support API action.");
    }
    const quota = await evaluateSupportApiQuota(auth);
    if (!quota.allowed) {
      await recordSupportApiUsage({ auth, operation: "conversations.create", method: "POST", path: request.nextUrl.pathname, statusCode: 429, billableUnits: 0 });
      return apiError("RATE_LIMITED", "This support API tenant has reached its monthly usage limit.");
    }
    const parsed = validateBody(supportApiConversationCreateSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const result = await createExternalSupportConversation({
      tenantId: String(auth.tenant._id),
      ...parsed.data
    });
    await recordSupportApiUsage({ auth, operation: "conversations.create", method: "POST", path: request.nextUrl.pathname, statusCode: 201 });
    return apiSuccess(result, { message: "Conversation ready.", status: 201 });
  } catch (error) {
    logSafeError("support-api.conversations.post", error);
    return apiError("INTERNAL_ERROR", "Unable to create conversation right now.");
  }
}
