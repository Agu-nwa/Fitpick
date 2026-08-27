export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { buildPersonalDataExport } from "@/lib/privacy/data-export";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";

export async function GET(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `users-me-data-export:${meta.ip}`, limit: 3, windowMs: 60 * 60 * 1000, operation: "users-me-data-export" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    const issuedAt = auth.user.activeSessionIssuedAt ? new Date(auth.user.activeSessionIssuedAt).getTime() : 0;
    if (!issuedAt || Date.now() - issuedAt > 30 * 60 * 1000) {
      return apiError("FORBIDDEN", "Please sign in again before exporting your personal data.");
    }

    const data = await buildPersonalDataExport(auth.user);
    await recordAuditEvent({ request, userId: String(auth.user._id), action: "account.data_export", entityType: "User", entityId: String(auth.user._id) });
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="myfitpick-data-${date}.json"`,
        "cache-control": "private, no-store, max-age=0",
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    logSafeError("users.me.data-export", error);
    return apiError("INTERNAL_ERROR", "Unable to export your personal data right now.");
  }
}
