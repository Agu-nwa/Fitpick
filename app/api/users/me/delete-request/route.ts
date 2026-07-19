export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireUser } from "@/lib/auth";
import { recordAuditEvent, requestMeta } from "@/lib/audit";
import { rateLimitRequest } from "@/lib/rate-limit";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";
import { PrivacyPreference } from "@/models/PrivacyPreference";
import { deleteRequestSchema } from "@/schemas/user.schema";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `users-me-delete:${meta.ip}`, limit: 5, windowMs: 60 * 60 * 1000, operation: "users-me-delete-request" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(deleteRequestSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const privacy = await PrivacyPreference.findOneAndUpdate(
      { userId: auth.user._id },
      {
        $set: { accountDeletionRequestedAt: new Date() }
      },
      { upsert: true, new: true }
    );

    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "account.delete_request",
      entityType: "PrivacyPreference",
      entityId: String(privacy._id)
    });

    return apiSuccess({
      deletionRequested: true,
      requestedAt: privacy.accountDeletionRequestedAt?.toISOString(),
      nextAction: "backend_deletion_workflow_pending"
    });
  } catch (error) {
    logSafeError("users.me.delete-request", error);
    return apiError("INTERNAL_ERROR", "Unable to request account deletion right now.");
  }
}
