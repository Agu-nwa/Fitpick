export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { isSupportChatEnabled } from "@/lib/support/config";
import { updateSupportConversationAssignment } from "@/lib/support/support-service";
import { readJson, validateBody } from "@/lib/validation";
import { supportAssignmentPatchSchema, supportConversationIdSchema } from "@/schemas/support.schema";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const params = validateBody(supportConversationIdSchema, await context.params);
    if (!params.ok) return params.response;
    const parsed = validateBody(supportAssignmentPatchSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;
    await connectDB();
    const conversation = await updateSupportConversationAssignment({ conversationId: params.data.id, actor: { userId: String(auth.user._id), role: auth.user.role }, assignedAgentId: parsed.data.assignedAgentId });
    await recordAuditEvent({ request, userId: String(auth.user._id), action: "support.assignment.update", entityType: "SupportConversation", entityId: conversation.id });
    return apiSuccess({ conversation });
  } catch (error) {
    logSafeError("admin.support.assignment", error);
    return apiError("INTERNAL_ERROR", "Unable to update support assignment right now.");
  }
}
