export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { logSafeError } from "@/lib/security/safe-log";
import { AccountDeletionRequest, accountDeletionStates } from "@/models/AccountDeletionRequest";

function serializeAdminDeletion(request: any) {
  return {
    id: String(request._id),
    deletionReference: String(request.deletionReference || ""),
    status: String(request.status || "requested"),
    requestedAt: request.requestedAt ? new Date(request.requestedAt).toISOString() : null,
    localDeletionCompletedAt: request.localDeletionCompletedAt ? new Date(request.localDeletionCompletedAt).toISOString() : null,
    providerCleanupUpdatedAt: request.providerCleanupUpdatedAt ? new Date(request.providerCleanupUpdatedAt).toISOString() : null,
    completedAt: request.completedAt ? new Date(request.completedAt).toISOString() : null,
    deletedObjectCount: Number(request.deletedObjectCount || 0),
    retainedRecordClasses: Array.isArray(request.retainedRecordClasses) ? request.retainedRecordClasses : [],
    lastError: String(request.lastError || ""),
    providerActions: (request.providerActions || []).map((action: any) => ({
      provider: String(action.provider || ""),
      action: String(action.action || ""),
      status: String(action.status || "manual_pending"),
      requestedAt: action.requestedAt ? new Date(action.requestedAt).toISOString() : null,
      completedAt: action.completedAt ? new Date(action.completedAt).toISOString() : null,
      evidenceReference: String(action.evidenceReference || ""),
      error: String(action.error || "")
    }))
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "").trim();
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit") || 50), 100));
    if (status && !accountDeletionStates.includes(status as (typeof accountDeletionStates)[number])) {
      return apiError("VALIDATION_ERROR", "Deletion status is not valid.");
    }

    const requests = await AccountDeletionRequest.find(status ? { status } : {})
      .sort({ requestedAt: -1 })
      .limit(limit)
      .select("deletionReference status requestedAt localDeletionCompletedAt providerCleanupUpdatedAt completedAt deletedObjectCount retainedRecordClasses lastError providerActions")
      .lean();
    const summary = await AccountDeletionRequest.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return apiSuccess({
      requests: requests.map(serializeAdminDeletion),
      summary: summary.map((entry) => ({ status: String(entry._id || "unknown"), count: Number(entry.count || 0) }))
    });
  } catch (error) {
    logSafeError("admin.account-deletions.list", error);
    return apiError("INTERNAL_ERROR", "Unable to load deletion requests right now.");
  }
}
