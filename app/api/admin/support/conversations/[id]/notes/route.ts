export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { isSupportChatEnabled } from "@/lib/support/config";
import { createSupportInternalNote, listSupportInternalNotes } from "@/lib/support/support-service";
import { readJson, validateBody } from "@/lib/validation";
import { supportConversationIdSchema, supportInternalNoteSchema } from "@/schemas/support.schema";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const params = validateBody(supportConversationIdSchema, await context.params);
    if (!params.ok) return params.response;
    await connectDB();
    const notes = await listSupportInternalNotes({ conversationId: params.data.id, actor: { userId: String(auth.user._id), role: auth.user.role } });
    return apiSuccess({ notes });
  } catch (error) {
    logSafeError("admin.support.notes.get", error);
    return apiError("INTERNAL_ERROR", "Unable to load internal notes right now.");
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const params = validateBody(supportConversationIdSchema, await context.params);
    if (!params.ok) return params.response;
    const parsed = validateBody(supportInternalNoteSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;
    await connectDB();
    const note = await createSupportInternalNote({ conversationId: params.data.id, actor: { userId: String(auth.user._id), role: auth.user.role }, body: parsed.data.body });
    await recordAuditEvent({ request, userId: String(auth.user._id), action: "support.note.create", entityType: "SupportConversation", entityId: params.data.id });
    return apiSuccess({ note }, { status: 201 });
  } catch (error) {
    logSafeError("admin.support.notes.post", error);
    return apiError("INTERNAL_ERROR", "Unable to save internal note right now.");
  }
}
