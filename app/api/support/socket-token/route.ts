export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { rateLimitRequest } from "@/lib/rate-limit";
import { requestMeta } from "@/lib/audit";
import { logSafeError } from "@/lib/security/safe-log";
import { isSupportChatEnabled } from "@/lib/support/config";
import { createSupportSocketToken } from "@/lib/support/socket-auth";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `support-socket-token:${meta.ip}`, limit: 30, windowMs: 60_000, operation: "support-socket-token" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (!isSupportChatEnabled()) return apiError("SETUP_REQUIRED", "Support chat is not available right now.", { status: 503 });
    const token = await createSupportSocketToken({ userId: String(auth.user._id), email: auth.user.email, role: auth.user.role, sessionId: auth.session.sessionId });
    return apiSuccess({ token, expiresInSeconds: 300 });
  } catch (error) {
    logSafeError("support.socket-token", error);
    return apiError("INTERNAL_ERROR", "Unable to connect support chat right now.");
  }
}
