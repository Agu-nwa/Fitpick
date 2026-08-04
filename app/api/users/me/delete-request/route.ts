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
import { enqueueJob } from "@/lib/jobs/queue";
import { createAccountDeletionRequest, disableAccountForDeletion, serializeAccountDeletionRequest } from "@/lib/account-deletion/account-deletion";
import { AccountDeletionRequest } from "@/models/AccountDeletionRequest";
import { getSessionUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export async function POST(request: NextRequest) {
  const meta = requestMeta(request);
  const limited = rateLimitRequest({ key: `users-me-delete:${meta.ip}`, limit: 5, windowMs: 60 * 60 * 1000, operation: "users-me-delete-request" });
  if (limited) return limited;

  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = validateBody(deleteRequestSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const issuedAt = auth.user.activeSessionIssuedAt ? new Date(auth.user.activeSessionIssuedAt).getTime() : 0;
    if (!issuedAt || Date.now() - issuedAt > 30 * 60 * 1000) {
      return apiError("FORBIDDEN", "Please sign in again before requesting account deletion.");
    }

    const deletionRequest = await createAccountDeletionRequest({ user: auth.user, reason: parsed.data.reason });
    let job = deletionRequest.jobId ? await import("@/models/BackgroundJob").then(({ BackgroundJob }) => BackgroundJob.findById(deletionRequest.jobId)) : null;
    if (!job || ["failed", "cancelled", "dead_letter"].includes(job.status)) {
      job = await enqueueJob("account_deletion", { deletionRequestId: String(deletionRequest._id) }, { userId: auth.user._id, maxAttempts: 8 });
      deletionRequest.jobId = job._id;
      await deletionRequest.save();
    }

    const disabledRequest = await disableAccountForDeletion(String(auth.user._id));
    try {
      await PrivacyPreference.findOneAndUpdate(
        { userId: auth.user._id },
        { $set: { accountDeletionRequestedAt: deletionRequest.requestedAt } },
        { upsert: true }
      );
      await recordAuditEvent({
        request,
        userId: String(auth.user._id),
        action: "account.delete_request",
        entityType: "AccountDeletionRequest",
        entityId: String(deletionRequest._id)
      });
    } catch (auditError) {
      logSafeError("users.me.delete-request.audit", auditError);
    }

    return apiSuccess({
      ...serializeAccountDeletionRequest(disabledRequest || deletionRequest),
      nextAction: "sign_out_and_wait_for_completion"
    });
  } catch (error) {
    logSafeError("users.me.delete-request", error);
    return apiError("INTERNAL_ERROR", "Unable to request account deletion right now.");
  }
}

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return apiError("UNAUTHORIZED", "Please sign in to continue.");
    await connectDB();
    const deletionRequest = await AccountDeletionRequest.findOne({ userId: session.userId }).lean();
    if (!deletionRequest) return apiError("NOT_FOUND", "No account deletion request was found.");
    return apiSuccess(serializeAccountDeletionRequest(deletionRequest));
  } catch (error) {
    logSafeError("users.me.delete-request.status", error);
    return apiError("INTERNAL_ERROR", "Unable to load account deletion status right now.");
  }
}
