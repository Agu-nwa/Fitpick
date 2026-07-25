export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { logSafeError } from "@/lib/security/safe-log";
import { isSupportChatEnabled } from "@/lib/support/config";
import { getAdminSupportOperationalContext } from "@/lib/support/support-service";
import { validateBody } from "@/lib/validation";
import { supportConversationIdSchema } from "@/schemas/support.schema";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const params = validateBody(supportConversationIdSchema, await context.params);
    if (!params.ok) return params.response;
    await connectDB();
    const supportContext = await getAdminSupportOperationalContext({ conversationId: params.data.id, actor: { userId: String(auth.user._id), role: auth.user.role } });
    return apiSuccess({ context: supportContext });
  } catch (error) {
    logSafeError("admin.support.context", error);
    return apiError("INTERNAL_ERROR", "Unable to load support context right now.");
  }
}
