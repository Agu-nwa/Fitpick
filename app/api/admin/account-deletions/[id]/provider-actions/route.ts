export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireAdmin } from "@/lib/admin";
import { recordAuditEvent } from "@/lib/audit";
import { updateDeletionProviderAction, serializeAccountDeletionRequest } from "@/lib/account-deletion/account-deletion";
import { logSafeError } from "@/lib/security/safe-log";
import { readJson, validateBody } from "@/lib/validation";

const providerActionSchema = z.object({
  provider: z.string().trim().min(1).max(60),
  status: z.enum(["completed", "failed", "not_applicable"]),
  evidenceReference: z.string().trim().max(240).optional(),
  error: z.string().trim().max(240).optional()
}).strict();

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const { id } = await context.params;
    if (!/^[a-f\d]{24}$/i.test(id)) return apiError("NOT_FOUND", "Deletion request was not found.");
    const parsed = validateBody(providerActionSchema, await readJson(request));
    if (!parsed.ok) return parsed.response;

    const deletion = await updateDeletionProviderAction({ requestId: id, ...parsed.data });
    if (!deletion) return apiError("NOT_FOUND", "Deletion request was not found.");
    await recordAuditEvent({
      request,
      userId: String(auth.user._id),
      action: "account.deletion_provider_cleanup.update",
      entityType: "AccountDeletionRequest",
      entityId: id
    });
    return apiSuccess({ deletion: serializeAccountDeletionRequest(deletion) });
  } catch (error) {
    logSafeError("admin.account-deletion.provider-action", error);
    return apiError("INTERNAL_ERROR", "Unable to update provider cleanup right now.");
  }
}
